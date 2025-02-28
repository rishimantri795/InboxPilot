const admin  = require("./firebase");
const db = admin.firestore()

async function getFirestoreSchema() {
  console.log("Fetching Firestore schema...");

  // Get top-level collections
  const collections = await db.listCollections();
  for (const collection of collections) {
    console.log(`📂 Collection: ${collection.id}`);

    // Get documents inside the collection
    const snapshot = await collection.get();
    for (const doc of snapshot.docs) {
      console.log(`  📄 Document: ${doc.id}`);

      // Get subcollections inside each document
      const subcollections = await doc.ref.listCollections();
      for (const subcollection of subcollections) {
        console.log(`    📁 Subcollection: ${subcollection.id}`);
      }
    }
  }
  console.log("✅ Firestore schema retrieval complete!");
}

getFirestoreSchema().catch(console.error);
