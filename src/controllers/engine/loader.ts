import axios from 'axios';
import mysql from 'mysql2/promise';
import { FILE_EXT_TO_READER, SimpleDirectoryReader } from 'llamaindex/readers/SimpleDirectoryReader';

export const DATA_DIR = "./data";

// Define constants for each data source
const DATA_URL = 'https://bahriatown.com/bahria-town-karachi/'; // Replace with your actual URL

// Database configuration (Replace with your actual database config)
// const DB_CONFIG = {
//   host: 'localhost',
//   user: 'your_username',
//   password: 'your_password',
//   database: 'your_database',
// };

// Function to get extractors (assuming it remains the same)
export function getExtractors() {
  return FILE_EXT_TO_READER;
}

// Function to load documents from the local directory
async function getDocumentsFromDirectory() {
  const documents = await new SimpleDirectoryReader().loadData({
    directoryPath: DATA_DIR,
  });

  // Set private=false to mark the document as public
  for (const document of documents) {
    document.metadata = {
      ...document.metadata,
      private: 'false',
    };
  }

  return documents;
}

// Function to load documents from a database
// async function getDocumentsFromDatabase() {
//   const connection = await mysql.createConnection(DB_CONFIG);

//   try {
//     // Query to fetch documents from the database
//     const [rows] = await connection.execute('SELECT * FROM documents'); // Replace with your table/query

//     // Convert rows to documents format
//     const documents = rows.map((row) => ({
//       ...row,
//       metadata: {
//         ...row.metadata,
//         private: 'false', // Set private=false to mark as public
//       },
//     }));

//     return documents;
//   } catch (error) {
//     console.error('Error fetching documents from the database:', error);
//     throw error;
//   } finally {
//     // Close the database connection
//     await connection.end();
//   }
// }


// Unified function to load all documents from all sources
export async function getDocuments() {
  try {
    // Fetch documents from each source
    // const [dirDocuments, dbDocuments, urlDocuments] = await Promise.all([
    //   getDocumentsFromDirectory(),
    //   getDocumentsFromDatabase(),
    //   getDocumentsFromURL(),
    // ]);
    const [dirDocuments] = await Promise.all([
      getDocumentsFromDirectory()
    ]);

    // Combine all documents into a single array
    // const allDocuments = [...dirDocuments, ...urlDocuments];
    const allDocuments = [...dirDocuments];

    return allDocuments;
  } catch (error) {
    console.error('Error loading documents from all sources:', error);
    throw error;
  }
}
