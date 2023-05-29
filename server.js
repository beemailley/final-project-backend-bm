import express from "express";
import cors from "cors";
import mongoose from "mongoose"; 
import crypto from "crypto";
import bcrypt from "bcrypt";



const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/final-project-users";
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;



// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
const port = process.env.PORT || 8080;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

// Start defining your routes here
app.get("/", (req, res) => {
  res.send("Hello Technigo!");
});

const UserSchema = new mongoose.Schema ({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    
  },
  lastName: {

  },
  emailAddress: {

  },
  memberSince: {
    type: Date,
    default: () => new Date()
  },
  gender: {
    type: String
  },
  birthday: {
    type: Date
  },
  interests: {
    type: String
  },
  currentCity: {
    type: String,
    required: true
  },
  homeCountry: {
    type: String
  },
  languages: {
    type: String
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex")
  }

})

const User = mongoose.model("User", UserSchema);




// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
