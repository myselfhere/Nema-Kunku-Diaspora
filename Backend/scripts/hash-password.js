// scripts/hash-password.js
const bcrypt = require("bcryptjs");

const password = "Password1"; // You can change this

bcrypt.hash(password, 10).then(hash => {
  console.log("Password:", password);
  console.log("Hash:", hash);
});
