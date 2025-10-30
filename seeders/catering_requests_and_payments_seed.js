"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  Customer,
  Catering,
  CateringRequest,
  CateringQuote,
  CateringPayment,
  CategoryTag,
} = require("../models");

module.exports = async () => {
  
  const now = new Date();
   console.log("🚀 Starting catering requests, quotes & payments syncing...");

  await CateringRequest.sync({ force: true });
  await CateringQuote.sync({ force: true });
  await CateringPayment.sync({ force: true });

  console.log("🚀 Starting catering requests, quotes & payments seeding...");

  try {
    // --- 1️⃣ Create or find CategoryTags
    const tagNames = [
      "Wedding",
      "Corporate",
      "Birthday",
      "Buffet",
      "Outdoor",
      "Luxury",
      "Vegan",
      "Casual",
    ];

    const tags = [];
    for (const name of tagNames) {
      const [tag] = await CategoryTag.findOrCreate({
        where: { name },
        defaults: { id: uuidv4(), name },
      });
      tags.push(tag);
    }

    console.log(`✅ Created or found ${tags.length} category tags.`);

    // --- 2️⃣ Find test customer
    const customer = await Customer.findOne({ where: { email: "customer1@gmail.com" } });
    if (!customer) {
      throw new Error("❌ Customer 'customer1@gmail.com' not found. Please seed customers first.");
    }

    // --- 3️⃣ Fetch some existing caterings
    const caterings = await Catering.findAll({ limit: 6 }); // Get 6 for better distribution
    if (!caterings.length) {
      throw new Error("❌ No catering packages found. Run catering seeder first.");
    }

    const requests = [];
    const quotes = [];
    const payments = [];

    // Define statuses and their distribution
    const statuses = ["pending", "approved", "rejected"];
    
    for (let i = 0; i < caterings.length; i++) {
      const catering = caterings[i];
      
      // Distribute statuses: first 2 pending, next 2 approved, last 2 rejected
      let status;
      if (i < 2) {
        status = "pending";
      } else if (i < 4) {
        status = "approved";
      } else {
        status = "rejected";
      }

      // Catering request by this customer
      const requestId = uuidv4();
      const guestCount = Math.floor(Math.random() * 100) + 20;
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * 30) + 7); // 1–30 days ahead

      const eventTypes = ["Wedding", "Birthday", "Corporate", "Anniversary", "Graduation"];
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

      // Different notes based on status for realism
      let notes;
      switch (status) {
        case "pending":
          notes = "Looking for a professional catering service for my upcoming event.";
          break;
        case "approved":
          notes = "Excited to have our event catered! Looking forward to the service.";
          break;
        case "rejected":
          notes = "Was hoping to get this catered but exploring other options.";
          break;
        default:
          notes = "Looking for a professional catering service for my upcoming event.";
      }

      const request = {
        id: requestId,
        catering_id: catering.id,
        customer_id: customer.id,
        event_type: eventType,
        guest_count: guestCount,
        event_date: eventDate,
        notes: notes,
        status: status,
        delivery_location_id: null,
        createdAt: now,
        updatedAt: now,
      };

      requests.push(request);

      // Only create quotes and payments for approved requests
      if (status === "approved") {
        // Create related quote
        const quoteId = uuidv4();
        const estimatedPrice = (Math.random() * 3000 + 1000).toFixed(2);

        const quote = {
          id: quoteId,
          catering_request_id: requestId,
          catering_id: catering.id,
          estimated_price: estimatedPrice,
          description: `Estimated cost for ${eventType} with ${guestCount} guests.`,
          status: "accepted",
          payment_status: "Paid",
          createdAt: now,
          updatedAt: now,
        };
        quotes.push(quote);

        // Create related payment
        const payment = {
          id: uuidv4(),
          catering_quote_id: quoteId,
          amount: estimatedPrice,
          payment_method: "Card",
          payment_status: "completed",
          transaction_id: "TX-" + Math.floor(Math.random() * 10000000),
          createdAt: now,
          updatedAt: now,
        };
        payments.push(payment);
      }
      
      // For rejected requests, you might want to create a rejected quote
      if (status === "rejected") {
        const quoteId = uuidv4();
        const estimatedPrice = (Math.random() * 3000 + 1000).toFixed(2);

        const quote = {
          id: quoteId,
          catering_request_id: requestId,
          catering_id: catering.id,
          estimated_price: estimatedPrice,
          description: `Quote for ${eventType} with ${guestCount} guests - REJECTED.`,
          status: "rejected",
          payment_status: "Unpaid",
          createdAt: now,
          updatedAt: now,
        };
        quotes.push(quote);
      }
    }

    // --- 4️⃣ Bulk create all data
    await CateringRequest.bulkCreate(requests);
    console.log(`✅ Created ${requests.length} catering requests with status distribution:`);
    console.log(`   - Pending: ${requests.filter(r => r.status === 'pending').length}`);
    console.log(`   - Approved: ${requests.filter(r => r.status === 'approved').length}`);
    console.log(`   - Rejected: ${requests.filter(r => r.status === 'rejected').length}`);

    if (quotes.length > 0) {
      await CateringQuote.bulkCreate(quotes);
      console.log(`✅ Created ${quotes.length} catering quotes.`);
    }

    if (payments.length > 0) {
      await CateringPayment.bulkCreate(payments);
      console.log(`✅ Created ${payments.length} catering payments.`);
    }

    console.log("🎉 Catering requests, quotes, and payments seeded successfully!");
  } catch (err) {
    console.error("❌ Error seeding catering data:", err);
    throw err;
  }
};

// const { v4: uuidv4 } = require("uuid");
// const {
//   Customer,
//   Catering,
//   CateringRequest,
//   CateringQuote,
//   CateringPayment,
//   CategoryTag,
// } = require("../models");

// module.exports = async () => {
//   const now = new Date();
//   console.log("🚀 Starting catering tags, requests, quotes & payments seeding...");

//   try {
//     // --- 1️⃣ Create or find CategoryTags
//     const tagNames = [
//       "Wedding",
//       "Corporate",
//       "Birthday",
//       "Buffet",
//       "Outdoor",
//       "Luxury",
//       "Vegan",
//       "Casual",
//     ];

//     const tags = [];
//     for (const name of tagNames) {
//       const [tag] = await CategoryTag.findOrCreate({
//         where: { name },
//         defaults: { id: uuidv4(), name },
//       });
//       tags.push(tag);
//     }

//     console.log(`✅ Created or found ${tags.length} category tags.`);

//     // --- 2️⃣ Find test customer
//     const customer = await Customer.findOne({ where: { email: "customer1@gmail.com" } });
//     if (!customer) {
//       throw new Error("❌ Customer 'customer1@gmail.com' not found. Please seed customers first.");
//     }

//     // --- 3️⃣ Fetch some existing caterings
//     const caterings = await Catering.findAll({ limit: 5 });
//     if (!caterings.length) {
//       throw new Error("❌ No catering packages found. Run catering seeder first.");
//     }

//     const requests = [];
//     const quotes = [];
//     const payments = [];

//     for (const catering of caterings) {
//       // Catering request by this customer
//       const requestId = uuidv4();
//       const guestCount = Math.floor(Math.random() * 100) + 20;
//       const eventDate = new Date();
//       eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * 30) + 7); // 1–30 days ahead

//       const eventTypes = ["Wedding", "Birthday", "Corporate", "Anniversary", "Graduation"];
//       const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

//       const request = {
//         id: requestId,
//         catering_id: catering.id,
//         customer_id: customer.id,
//         event_type: eventType,
//         guest_count: guestCount,
//         event_date: eventDate,
//         notes: "Looking for a professional catering service for my upcoming event.",
//         status: "pending",
//         delivery_location_id: null,
//         createdAt: now,
//         updatedAt: now,
//       };

//       requests.push(request);

//       // Create related quote
//       const quoteId = uuidv4();
//       const estimatedPrice = (Math.random() * 3000 + 1000).toFixed(2);

//       const quote = {
//         id: quoteId,
//         catering_request_id: requestId,
//         catering_id: catering.id,
//         estimated_price: estimatedPrice,
//         description: `Estimated cost for ${eventType} with ${guestCount} guests.`,
//         status: "accepted",
//         payment_status: "Paid",
//         createdAt: now,
//         updatedAt: now,
//       };
//       quotes.push(quote);

//       // Create related payment
//       const payment = {
//         id: uuidv4(),
//         catering_quote_id: quoteId,
//         amount: estimatedPrice,
//         payment_method: "Card",
//         payment_status: "completed",
//         transaction_id: "TX-" + Math.floor(Math.random() * 10000000),
//         createdAt: now,
//         updatedAt: now,
//       };
//       payments.push(payment);
//     }

//     // --- 4️⃣ Bulk create all data
//     await CateringRequest.bulkCreate(requests);
//     console.log(`✅ Created ${requests.length} catering requests.`);

//     await CateringQuote.bulkCreate(quotes);
//     console.log(`✅ Created ${quotes.length} catering quotes.`);

//     await CateringPayment.bulkCreate(payments);
//     console.log(`✅ Created ${payments.length} catering payments.`);

//     console.log("🎉 Catering requests, quotes, and payments seeded successfully!");
//   } catch (err) {
//     console.error("❌ Error seeding catering data:", err);
//     throw err;
//   }
// };
