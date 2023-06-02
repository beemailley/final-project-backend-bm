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

const countryList = require('country-list');


const UserSchema = new mongoose.Schema ({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 2,
    maxlength: 20
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    minlength: 2,
    maxlength: 20
  },
  lastName: {
    type: String,
    minlength: 2,
    maxlength: 20
  },
  emailAddress: {
    type: String,
     unique: true,
     match: [/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/, 'Please enter a valid email address'],
    default: ''
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
    type: Date,
    default: ''
  },
  interests: {
    type: String,
    default: ''
  },
  currentCity: {
    type: String,
    enum: ['Stockholm', 'London', ''],
    default: ''
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
        response: "Username already exists."
      })
    } else {
      const salt = bcrypt.genSaltSync();
      const newUser = await new User({
        username: username,
        password: bcrypt.hashSync(password, salt),
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
    const user = await User.findOne({ username: username })
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

app.get("/users", async (req, res) => {
  try {
    const users = await User.find({});
    if (users.length > 0) {
      res.status(200).json({ 
        success: true, 
        response: users, 
        message: "Users found" });
    } else {
      res.status(400).json({ 
        success: false, 
        response: null, 
        message: "No users found" });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      response: null, 
      message: "Error retrieving users" });
  }
});

const authenticateUser = async (req, res, next) => {
  
  const accessToken = req.header("Authorization");
  try {
    const user = await User.findOne({accessToken: accessToken})
    if (user) {
      next();
    } else {
      res.status(401).json({
        success: false,
        response: "Please log in"
      })
    }
  } catch (e) {
    res.status(500).json({
      success: false,
      response: e
    });
  }
}

app.get("/users/:username", authenticateUser);
app.get("/users/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ username });

    if (user) {
      user.firstName = req.body.firstName || user.firstName;
      user.lastName = req.body.lastName || user.lastName;
      user.gender = req.body.gender || user.gender;
      user.birthday = req.body.birthday || user.birthday;
      user.interests = req.body.interests || user.interests;
      user.currentCity = req.body.currentCity || user.currentCity;
      user.homeCountry = req.body.homeCountry || user.homeCountry;
      user.languages = req.body.languages || user.languages;
      
      res.status(200).json({ 
        success: true, 
        response: user,
        message: "User found" });
    } else {
      res.status(400).json({ 
        success: false, 
        response: null, 
        message: "No user found" });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      response: null, 
      message: "Error retrieving user" });
  }
});

app.patch("/users/:username/udpate", authenticateUser);
app.patch("/users/:username/update", async (req, res) => {
  const { username } = req.params;
try {
  const user = await User.findOne({ username });
  if (user) {
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.gender = req.body.gender || user.gender;
    user.birthday = req.body.birthday || user.birthday;
    user.interests = req.body.interests || user.interests;
    user.currentCity = req.body.currentCity || user.currentCity;
    user.homeCountry = req.body.homeCountry || user.homeCountry;
    user.languages = req.body.languages || user.languages;
    
    const updatedUser = await user.save();
    res.status(200).json({
      success: true,
      response: updatedUser,
      message: `Username ${updatedUser.username} updated profile successfully.`
    })
  } else {
    res.status(400).json({
      success: false,
      message: "User not found"
    })
  }
} catch (error) {
  console.log(error)
  res.status(500).json({
    success: false,
    response: null,
    message: "Error occurred"
  })
}
})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
