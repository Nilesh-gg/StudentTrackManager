import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// For development purposes only - in production, use proper password hashing
function hashPassword(password: string) {
  return password; // No hashing, just return the password directly
}

function comparePasswords(supplied: string, stored: string) {
  return supplied === stored; // Direct comparison
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "student-management-app-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("LocalStrategy - Looking up user:", username);
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log("LocalStrategy - User not found");
          return done(null, false);
        }
        
        console.log("LocalStrategy - User found, comparing passwords");
        console.log("Input password:", password);
        console.log("Stored password:", user.password);
        
        const passwordsMatch = await comparePasswords(password, user.password);
        console.log("Passwords match:", passwordsMatch);
        
        if (!passwordsMatch) {
          console.log("LocalStrategy - Password mismatch");
          return done(null, false);
        } else {
          console.log("LocalStrategy - Authentication successful");
          return done(null, user);
        }
      } catch (error) {
        console.log("LocalStrategy - Error:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Error during registration" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt:", {
      username: req.body.username,
      password: req.body.password
    });
    
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: any) => {
      if (err) {
        console.log("Login error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Authentication failed - invalid credentials");
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.log("Login session error:", err);
          return next(err);
        }
        
        console.log("Authentication successful for user:", user.username);
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    // Remove password from response
    if (req.user) {
      const { password, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}