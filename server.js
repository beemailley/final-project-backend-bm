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
    type: String,
    minlength: 2,

  },
  emailAddress: {
    type: String,
    unique: true,
    match: [/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/, 'Please enter a valid email address']
  },
  memberSince: {
    type: Date,
    default: () => new Date()
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'non-binary', 'other', 'prefer not to say'],
    default: 'prefer not to say'
  },
  birthday: {
    type: Date
  },
  interests: {
    type: String
  },
  currentCity: {
    type: String,
    enum: ['Stockholm', 'London']
  },
  homeCountry: {
    type: String,
    enum: countryList.getNames()
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

app.post("/register", async (req, res) => {
  const { username, password} = req.body;
  try {
    const user = await User.findOne({ username });
    if (user) {
      res.status(400).json({
        success: false,
        response: "Username already exists,"
      })
    } else {
      const salt = bcrypt.genSaltSync();
      const newUser = await new User({
        username: username,
        password: bcrypt.hashSync(password, salt)
      }).save();
      res.status(201).json({
        success: true,
        response: {
          username: newUser.username,
          id: newUser._id,
          accessToken: newUser.accessToken
        }
    })
  }
} catch (e) {
  console.log(e);
    res.status(400).json({
      success: false,
      response: "Registration failed. Please try again."
    })
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({username: username})
    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(200).json({
        success: true,
        response: {
          username: user.username,
          id: user._id,
          accessToken: user.accessToken
    }
  });
  } else {
      res.status(400).json({
        success: false,
        response: "Credentials do not match"
    });
  } 
} catch (e) {
      console.log(e)
        res.status(400).json({
        success: false,
        response: e
    })
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
