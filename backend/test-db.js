const dns = require("dns");
const mongoose = require("mongoose");

const uri =
  "mongodb+srv://hkush2005_db_user:bZTH6rU8JInaaTn4@cluster0.uevmno6.mongodb.net/?appName=Cluster0";

console.log("Testing DNS resolution...");

dns.resolveSrv(
  "_mongodb._tcp.cluster0.uevmno6.mongodb.net",
  (err, addresses) => {
    if (err) {
      console.error("DNS resolution failed:", err.message);
      return;
    }
    console.log("DNS resolved:", addresses);

    console.log("Testing MongoDB connection...");

    mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      })
      .then(() => {
        console.log("Connected successfully");
        mongoose.disconnect();
      })
      .catch((err) => {
        console.error("Connection failed:", err.message);
        console.error("Error code:", err.code);
        console.error("Error codeName:", err.codeName);
      });
  },
);
