import express from "express";
import cors from "cors";
import mongoose from "mongoose"; 
import crypto from "crypto";
import bcrypt from "bcrypt";

// for websocket

import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 

const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1/final-project-backend";
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
const port = process.env.PORT || 8080;

const countryList = require('country-list');
const allEndpoints = require('express-list-endpoints');

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

const UserSchema = new mongoose.Schema ({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
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
    match: [/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/, 'Please enter a valid email address']
    // sparse: true, // allows it to have missing or null values
    // index: true
    },
  memberSince: {
    type: Date,
    default: () => new Date()
  },
  gender: {
    type: String,
    enum: ['Select your gender','male', 'female', 'non-binary', 'other', 'prefer not to say'],
    default: 'Select your gender'
  },
  birthday: {
    type: Date,
    default: () => new Date ()
  },
  interests: {
    type: String,
    enum: ['Select an interest', 'Category One', 'Category Two', 'Category Three', 'Category Four', 'Category Five'],
    default: 'Select an interest'
    // need to match the list to eventCategory in the Event Schema
    // need to create interests/categories list
  },
  currentCity: {
    type: String,
    enum: ['Stockholm', 'London', 'Paris'],
    default: 'Stockholm'
  },
  homeCountry: {
    type: String,
    enum: countryList.getNames(),
    default: function () {
      const defaultCountry = 'Select a country';
      if (countryList.getNames().includes(defaultCountry)) {
        return defaultCountry;
      }
      return undefined;
    },
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

// Start defining your routes here
app.get("/", (req, res) => {
  // res.send("Hello Technigo!");
  res.json(allEndpoints(app));
});

//register as a new user
//do not need prior authorization, anyone can register
app.post("/register", async (req, res) => {
  const { username, password, emailAddress } = req.body;
  try {
    const user = await User.findOne({ username });
    const email = await User.findOne({ emailAddress })
    if (user || email) {
      res.status(400).json({
        success: false,
        response: "Username or email already exists."
      })
    } else {
      const salt = bcrypt.genSaltSync();
      const newUser = await new User({
        username: username,
        password: bcrypt.hashSync(password, salt), 
        emailAddress: emailAddress
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

//login as an existing user
//must register first, then user will be able to login
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
        response: "Username or password is incorrect"
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

//get a list of all users
//only authenticated users can request a list of all users
app.get("/users", authenticateUser)
app.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, 'username firstName lastName emailAddress memberSince gender birthday interests currentCity homeCountry languages');
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

//get a single user profile
//only authenticated users can request the profile for a single user
app.get("/users/:username", authenticateUser);
app.get("/users/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ username }, 'username firstName lastName emailAddress memberSince gender birthday interests currentCity homeCountry languages');

    if (user) {
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


//update a single user profile
//user must be authenticated AND can only edit their own profile
app.patch("/users/:username/update", authenticateUser);
app.patch("/users/:username/update", async (req, res) => {
  const { username } = req.params;
  const accessToken = req.header("Authorization");
  const authorizedUser = await User.findOne({accessToken: accessToken});
try {
  const user = await User.findOne({ username });
  if (user.username === authorizedUser.username) {
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.emailAddress = req.body.emailAddress || user.emailAddress;
    user.gender = req.body.gender || user.gender;
    user.birthday = req.body.birthday || user.birthday;
    user.interests = req.body.interests || user.interests;
    user.currentCity = req.body.currentCity || user.currentCity;
    user.homeCountry = req.body.homeCountry || user.homeCountry;
    user.languages = req.body.languages || user.languages;
    
    const updatedUser = await user.save();
    res.status(200).json({
      success: true,
      response: {
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName, 
        emailAddress: updatedUser.emailAddress,
        memberSince: updatedUser.memberSince,
        gender: updatedUser.gender,
        birthday: updatedUser.birthday,
        interests: updatedUser.interests,
        currentCity: updatedUser.currentCity,
        homeCountry: updatedUser.homeCountry,
        languages: updatedUser.languages,
      }, 
      message: `Username ${updatedUser.username} updated profile successfully.`
    })
  } else {
    res.status(400).json({
      success: false,
      message: "User not found OR you are not authorized to edit this user."
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

const AttendeeSchema = new mongoose.Schema ({ 
  attendeeName: {
    type: String
  },
  attendeeHomeCountry: {
    type: String
  }, 
  attendeeUserId: {
    type: String
  }
})

const Attendee = mongoose.model("Attendee", AttendeeSchema)

const EventSchema = new mongoose.Schema ({
  eventName: {
    type: String,
    minLength: 5,
    maxLength: 100,
    default: "Event"
  },
  eventDateAndTime: {
    type: Date,
    default: () => new Date ()
    // will need to convert any inputs for date and time on frontend to a Date object
  }, 
  eventVenue: {
    type: String,
    default: ""
  },
  eventAddress: {
    type: String,
    default: ""
  },
  eventCategory: {
    type: String,
    enum: ["Category One", "Category Two", "Category Three", "Category Four", "Category Five"],
    default: "Category One"
    // need to come from a specific list that matches the user schema
    // need to create interests/categories list
  },
  eventSummary: {
    type: String,
    minLength: 20,
    maxLength: 280,
    default: "This is an event for people to gather."
  },
  eventAttendees: {
    type: [AttendeeSchema],
    default: []
  }, 
  createdBy: {
    type: String
    //this should be the username or accessToken of the person creating the event
    //fetch from frontend store
  }
});

const Event = mongoose.model("Event", EventSchema)

//post a new event
//only authenticated users can create and event. The user who is creating the event will be attached to this event. Their username is the "createdBy"
app.post('/events', authenticateUser)
app.post('/events', async (req, res) => {
  const {eventName, eventDateAndTime, eventVenue, eventAddress, eventCategory, eventSummary} = req.body;
  const accessToken = req.header("Authorization");
  const eventCreator = await User.findOne({accessToken: accessToken})
  try {
    const event = await new Event({eventName, eventDateAndTime, eventVenue, eventAddress, eventCategory, eventSummary, createdBy: eventCreator.username}).save()
   res.status(201).json({
    success: true,
    response: event
   })
  } catch (error) {
    res.status(500).json({
      success: false,
      response: {message: error}
    })
  }
})

//get a list of all events
//only authenticated users can request a list of all events.
app.get('/events', authenticateUser)
app.get('/events', async (req, res) => {
  try {
    const allEvents = await Event.find();
    if(allEvents){
      res.status(200).json({
        success: true,
        response: allEvents
      });
    } else {
      res.status(404).json({
        success: false,
        response: {message: error}
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      response: {message: error}
    })
  }
})

//get a single events
//only authenticated users can request a list of all events.
app.get('/events/:eventId', authenticateUser)
app.get('/events/:eventId', async (req, res) => {
  const { eventId } = req.params
  try {
    const singleEvent = await Event.findById(eventId);
    if(singleEvent){
      res.status(200).json({
        success: true,
        response: singleEvent
      });
    } else {
      res.status(404).json({
        success: false,
        response: {message: error}
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      response: {message: error}
    })
  }
})

//edit an existing event
// user must be authenticated AND only the user who created an event can edit it
app.patch('/events/:eventId', authenticateUser)
app.patch('/events/:eventId', async (req, res) => {
  const { eventId } = req.params
  const accessToken = req.header("Authorization");
  const authorizedUser = await User.findOne({accessToken: accessToken});
  try {
    const eventToEdit = await Event.findById(eventId)
    if(eventToEdit.createdBy === authorizedUser.username){
      eventToEdit.eventName = req.body.eventName || eventToEdit.eventName;
      eventToEdit.eventDateAndTime = req.body.eventDateAndTime || eventToEdit.eventDateAndTime;
      eventToEdit.eventVenue = req.body.eventVenue || eventToEdit.eventVenue;
      eventToEdit.eventAddress = req.body.eventAddress|| eventToEdit.eventAddress;
      eventToEdit.eventCategory = req.body.eventCategory || eventToEdit.eventCategory;
      eventToEdit.eventSummary = req.body.eventSummary || eventToEdit.eventSummary;
      const updatedEvent = await eventToEdit.save()
      res.status(200).json({
        success: true,
        response: updatedEvent
      })
    } else {
      res.status(400).json({
        success: false,
        response: {message: "Event not found OR you are not authorized to edit this event."}
      })
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      response: {message: error}
    })
  }
})

//delete a single event
// user must be authenticated AND only the user who created an event can delete it
app.delete('/events/:eventId', authenticateUser)
app.delete('/events/:eventId', async (req, res) => {
  const { eventId } = req.params
  const accessToken = req.header("Authorization");
  const authorizedUser = await User.findOne({accessToken: accessToken});
  try {
    const eventToDelete = await Event.findById(eventId)
    if(eventToDelete.createdBy === authorizedUser.username){
      const deleteEvent = eventToDelete.deleteOne()
      res.status(200).json({
        success: true,
        response: {message: "Event Deleted"}
      })
    } else {
      res.status(400).json({
        success: false,
        response: {message: "Event not found OR you are not authorized to delete this event."}
      })
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      response: {message: error}
    })
  }
})

//add attendees to an event
//only authorized users may add themselves as an attendee to an event
app.post('/events/:eventId/attendees', authenticateUser)
app.post('/events/:eventId/attendees', async (req, res) => {
  const { eventId } = req.params
  const accessToken = req.header("Authorization");
  const authorizedUser = await User.findOne({accessToken: accessToken})
  try {
    const eventToEdit = await Event.findById(eventId)
    const eventAttendeesList = eventToEdit.eventAttendees
    const foundAttendee = eventAttendeesList.find((attendee) => attendee.attendeeName === authorizedUser.username)
    if(eventToEdit){
      if(!foundAttendee){
        const editEvent = await Event.updateOne(
          {_id: eventId},
          {
            $push: {
              eventAttendees: {
                $each:[{
                  attendeeName: authorizedUser.username, 
                  attendeeHomeCountry: authorizedUser.homeCountry, 
                  attendeeUserId: authorizedUser._id
                }]
              }
          }}
        )
        res.status(200).json({
          success: true,
          response: "Attendee added"
        })
      } else {
        res.status(400).json({
          success: false,
          response: "You have already joined this event."
        })
      }
    } else {
      res.status(400).json({
        success: false,
        response: "There is no such event"
      })
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      response: {error},
      message: "Something has gone horribly wrong"
    })
  }
})

//delete an attendee from an event
//user must be authenticated AND only the attendee can remove themselves from the event
app.delete('/events/:eventId/attendees/:attendeeUserId', authenticateUser)
app.delete('/events/:eventId/attendees/:attendeeUserId', async (req, res) => {
  const { eventId, attendeeUserId } = req.params;
  const accessToken = req.header("Authorization");
  const authorizedUser = await User.findOne({accessToken: accessToken})
  try {
    const eventToEdit = await Event.findById(eventId)
    if(eventToEdit && attendeeUserId === authorizedUser._id.toString()){
      const editEvent = await Event.updateOne(
        {_id: eventId},
        {
          $pull: {
            eventAttendees: {attendeeUserId: attendeeUserId}
        }}
      )
      res.status(200).json({
        success: true,
        response: "Attendee removed"
      })
    } else {
      res.status(400).json({
        success: false,
        response: "There is no event or attendee with that ID"
      })
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      response: {message: error}
    })
  }
})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
