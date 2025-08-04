// const { Op } = require("sequelize");
// const { Contact } = require("../models");
// const e = require("express");
// const { link } = require("joi");

// exports.handleIdentify = async ({ email, phoneNumber }) => {
//   // 1. Find all matching contacts by email or phoneNumber
//   const existingContacts = await Contact.findAll({
//     where: {
//       [Op.or]: [
//         email ? { email } : null,
//         phoneNumber ? { phoneNumber } : null,
//       ].filter(Boolean),
//     },
//     order: [["createdAt", "ASC"]],
//   });

//   // 2. If no matches, create new primary contact
//   if (existingContacts.length === 0) {
//     const newContact = await Contact.create({
//       email,
//       phoneNumber,
//       linkPrecedence: "primary",
//     });

//     return {
//       primaryContactId: newContact.id,
//       emails: [newContact.email].filter(Boolean),
//       phoneNumbers: [newContact.phoneNumber].filter(Boolean),
//       secondaryContactIds: [],
//     };
//   }

//   // 3. Merge all linked contacts (including indirectly linked)
//   const contactIds = new Set();
//   const emailSet = new Set();
//   const phoneSet = new Set();

//   const getAllLinkedContacts = async (baseContacts) => {
//     const visited = new Set();
//     const stack = [...baseContacts];

//     while (stack.length > 0) {
//       const contact = stack.pop();

//       if (visited.has(contact.id)) continue;

//       visited.add(contact.id);
//       contactIds.add(contact.id);
//       if (contact.email) emailSet.add(contact.email);
//       if (contact.phoneNumber) phoneSet.add(contact.phoneNumber);

//       const linkedContacts = await Contact.findAll({
//         where: {
//           [Op.or]: [{ linkedId: contact.id }, { id: contact.linkedId }],
//         },
//       });

//       stack.push(...linkedContacts);
//     }

//     return Array.from(visited);
//   };

//   const allLinkedIds = await getAllLinkedContacts(existingContacts);

//   const allContacts = await Contact.findAll({
//     where: {
//       id: allLinkedIds,
//     },
//     order: [["createdAt", "ASC"]],
//   });

//   // 4. Find the oldest primary (will become canonical)
//   const primaryContact = allContacts.find(
//     (c) => c.linkPrecedence === "primary"
//   );
//   const truePrimary = allContacts.reduce((oldest, current) => {
//     return oldest.createdAt <= current.createdAt ? oldest : current;
//   }, primaryContact);

//   // 5. Update all others to be secondary linked to truePrimary
//   for (const contact of allContacts) {
//     if (contact.id === truePrimary.id) continue;

//     if (
//       contact.linkPrecedence !== "secondary" ||
//       contact.linkedId !== truePrimary.id
//     ) {
//       await contact.update({
//         linkPrecedence: "secondary",
//         linkedId: truePrimary.id,
//       });
//     }
//   }

//   // 6. If input email/phone is not yet seen, create secondary contact
//   const seenEmails = allContacts.map((c) => c.email);
//   const seenPhones = allContacts.map((c) => c.phoneNumber);

//   const isNewEmail = email && !seenEmails.includes(email);
//   const isNewPhone = phoneNumber && !seenPhones.includes(phoneNumber);

//   let newSecondary = null;
//   if (isNewEmail || isNewPhone) {
//     newSecondary = await Contact.create({
//       email,
//       phoneNumber,
//       linkPrecedence: "secondary",
//       linkedId: truePrimary.id,
//     });
//     allContacts.push(newSecondary);
//   }

//   // 7. Build final response
//   const emails = [];
//   const phoneNumbers = [];
//   const secondaryContactIds = [];

//   for (const contact of allContacts) {
//     if (contact.email && !emails.includes(contact.email)) {
//       emails.push(contact.email);
//     }
//     if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) {
//       phoneNumbers.push(contact.phoneNumber);
//     }
//     if (
//       contact.linkPrecedence === "secondary" &&
//       contact.id !== truePrimary.id
//     ) {
//       secondaryContactIds.push(contact.id);
//     }
//   }

//   return {
//     primaryContatctId: truePrimary.id,
//     emails,
//     phoneNumbers,
//     secondaryContactIds,
//   };
// };

// services/contactService.js
const { Op, Sequelize } = require("sequelize");
const { Contact } = require("../models");

exports.handleIdentify = async ({ email, phoneNumber }) => {
  const t = await Contact.sequelize.transaction();
  try {
    // 1. Find all matching contacts with a single optimized query
    const baseContacts = await Contact.findAll({
      where: {
        [Op.or]: [
          email ? { email } : null,
          phoneNumber ? { phoneNumber } : null,
        ].filter(Boolean),
      },
      transaction: t,
    });

    if (baseContacts.length === 0) {
      // No matches found, create new primary contact
      const newContact = await Contact.create(
        { email, phoneNumber, linkPrecedence: "primary" },
        { transaction: t }
      );

      await t.commit();
      return {
        primaryContatctId: newContact.id,
        emails: [newContact.email].filter(Boolean),
        phoneNumbers: [newContact.phoneNumber].filter(Boolean),
        secondaryContactIds: [],
      };
    }

    const baseIds = baseContacts.map((c) => c.id);
    const linkedIds = baseContacts.map((c) => c.linkedId).filter(Boolean);

    // 2. Get all related contacts (1 hop)
    const allContacts = await Contact.findAll({
      where: {
        [Op.or]: [
          { id: { [Op.in]: [...baseIds, ...linkedIds] } },
          { linkedId: { [Op.in]: [...baseIds, ...linkedIds] } },
        ],
      },
      order: [["createdAt", "ASC"]],
      transaction: t,
    });

    // 3. Determine the true primary (oldest primary contact)
    const truePrimary = allContacts.reduce((oldest, curr) => {
      if (curr.linkPrecedence === "primary") {
        if (!oldest || curr.createdAt < oldest.createdAt) {
          return curr;
        }
      }
      return oldest;
    }, null);

    // 4. Update others to be secondaries linked to true primary
    for (const contact of allContacts) {
      if (
        contact.id !== truePrimary.id &&
        (contact.linkPrecedence !== "secondary" ||
          contact.linkedId !== truePrimary.id)
      ) {
        await contact.update(
          {
            linkPrecedence: "secondary",
            linkedId: truePrimary.id,
          },
          { transaction: t }
        );
      }
    }

    // 5. Check if a new secondary is needed
    const seenEmails = allContacts.map((c) => c.email);
    const seenPhones = allContacts.map((c) => c.phoneNumber);

    const isNewEmail = email && !seenEmails.includes(email);
    const isNewPhone = phoneNumber && !seenPhones.includes(phoneNumber);

    if (isNewEmail || isNewPhone) {
      const newSecondary = await Contact.create(
        {
          email,
          phoneNumber,
          linkPrecedence: "secondary",
          linkedId: truePrimary.id,
        },
        { transaction: t }
      );
      allContacts.push(newSecondary);
    }

    // 6. Build final response
    const emails = [];
    const phoneNumbers = [];
    const secondaryContactIds = [];

    for (const c of allContacts) {
      if (c.email && !emails.includes(c.email)) emails.push(c.email);
      if (c.phoneNumber && !phoneNumbers.includes(c.phoneNumber))
        phoneNumbers.push(c.phoneNumber);
      if (c.linkPrecedence === "secondary") secondaryContactIds.push(c.id);
    }

    await t.commit();

    return {
      primaryContatctId: truePrimary.id,
      emails,
      phoneNumbers,
      secondaryContactIds,
    };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};
