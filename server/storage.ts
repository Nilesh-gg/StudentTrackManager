import { students, type Student, type InsertStudent, type StudentStats, type User, type InsertUser } from "@shared/schema";
import mongoose, { Schema, Document } from "mongoose";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from '@neondatabase/serverless';
import session from "express-session";
import connectMongo from "connect-mongo";

// Define interfaces
export interface IStorage {
  // Student management
  getStudents(filters?: StudentFilters): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentById(studentId: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;
  getStudentStats(): Promise<StudentStats>;
  
  // User authentication
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Session store for authentication
  sessionStore: session.Store;
}

// Define filter types
export type StudentFilters = {
  status?: string;
  grade?: number;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

// MongoDB Schema definitions
interface IStudentDocument extends Document {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  grade: number;
  classSection?: string;
  address?: string;
  notes?: string;
  status: "active" | "inactive" | "pending";
  userId?: number; // Reference to user account
}

interface IUserDocument extends Document {
  username: string;
  password: string;
  role: "admin" | "student";
  createdAt: Date;
  lastLogin?: Date;
}

const StudentSchema = new Schema({
  studentId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  grade: { type: Number, required: true },
  classSection: { type: String },
  address: { type: String },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ["active", "inactive", "pending"], 
    default: "active", 
    required: true 
  },
  userId: { type: Number } // Reference to user account
});

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ["admin", "student"], 
    default: "student", 
    required: true 
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

// MongoDB Storage implementation
export class MongoStorage implements IStorage {
  private StudentModel: mongoose.Model<IStudentDocument>;
  private UserModel: mongoose.Model<IUserDocument>;
  private isConnected: boolean = false;
  private cache: Map<string, { data: any, timestamp: number }> = new Map();
  private cacheTTL = 60000; // 1 minute cache TTL
  public sessionStore: session.Store;

  constructor() {
    try {
      console.log("Attempting to connect to MongoDB...");
      
      // We need to encode the special characters in the password
      const username = "nileshjeet12345";
      const password = encodeURIComponent("Subasini@1");
      const host = "student.jy8kqka.mongodb.net";
      const connectionString = `mongodb+srv://${username}:${password}@${host}/?retryWrites=true&w=majority&appName=Student`;
      
      mongoose.connect(connectionString);
      
      this.StudentModel = mongoose.model<IStudentDocument>('Student', StudentSchema);
      this.UserModel = mongoose.model<IUserDocument>('User', UserSchema);
      this.sessionStore = connectMongo.create({ 
        mongoUrl: connectionString,
        collectionName: 'sessions'
      });
      this.isConnected = true;
      console.log("MongoDB connected successfully");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      throw new Error("Failed to connect to MongoDB - using in-memory storage");
    }
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }
    
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private invalidateCache(): void {
    this.cache.clear();
  }

  private convertToStudent(doc: IStudentDocument): Student {
    return {
      id: parseInt(doc._id.toString().substring(0, 8), 16), // Generate numeric ID from ObjectId
      studentId: doc.studentId,
      firstName: doc.firstName,
      lastName: doc.lastName,
      email: doc.email,
      phone: doc.phone || '',
      grade: doc.grade,
      classSection: doc.classSection || '',
      address: doc.address || '',
      notes: doc.notes || '',
      status: doc.status,
      userId: doc.userId || null,
    };
  }
  
  private convertToUser(doc: IUserDocument): User {
    return {
      id: parseInt(doc._id.toString().substring(0, 8), 16), // Generate numeric ID from ObjectId
      username: doc.username,
      password: doc.password,
      role: doc.role,
      createdAt: doc.createdAt,
      lastLogin: doc.lastLogin || null,
    };
  }

  async getStudents(filters: StudentFilters = {}): Promise<Student[]> {
    const cacheKey = `students:${JSON.stringify(filters)}`;
    const cachedData = this.getCached<Student[]>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    try {
      const query: any = {};
      
      if (filters.status && filters.status !== 'all') {
        query.status = filters.status;
      }
      
      if (filters.grade && filters.grade !== 0) {
        query.grade = filters.grade;
      }
      
      if (filters.search) {
        query.$or = [
          { firstName: { $regex: filters.search, $options: 'i' } },
          { lastName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
          { studentId: { $regex: filters.search, $options: 'i' } }
        ];
      }
      
      let findQuery = this.StudentModel.find(query);
      
      // Sorting
      if (filters.sort) {
        const [field, direction] = filters.sort.split('_');
        const sortDir = direction === 'asc' ? 1 : -1;
        
        if (field === 'name') {
          findQuery = findQuery.sort({ firstName: sortDir, lastName: sortDir });
        } else if (field === 'id') {
          findQuery = findQuery.sort({ studentId: sortDir });
        }
      } else {
        // Default sort
        findQuery = findQuery.sort({ firstName: 1 });
      }
      
      // Pagination
      if (filters.page && filters.limit) {
        const skip = (filters.page - 1) * filters.limit;
        findQuery = findQuery.skip(skip).limit(filters.limit);
      }
      
      const documents = await findQuery.exec();
      const students = documents.map(doc => this.convertToStudent(doc));
      
      this.setCache(cacheKey, students);
      return students;
    } catch (error) {
      console.error("Error getting students:", error);
      throw new Error("Failed to fetch students");
    }
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const cacheKey = `student:${id}`;
    const cachedData = this.getCached<Student>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    try {
      // Since we're converting ObjectId to numeric ID, we need to fetch all and find by our generated ID
      const students = await this.getStudents();
      const student = students.find(s => s.id === id);
      
      if (student) {
        this.setCache(cacheKey, student);
      }
      
      return student;
    } catch (error) {
      console.error(`Error getting student with id ${id}:`, error);
      throw new Error("Failed to fetch student");
    }
  }

  async getStudentById(studentId: string): Promise<Student | undefined> {
    const cacheKey = `studentById:${studentId}`;
    const cachedData = this.getCached<Student>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    try {
      const document = await this.StudentModel.findOne({ studentId }).exec();
      
      if (!document) {
        return undefined;
      }
      
      const student = this.convertToStudent(document);
      this.setCache(cacheKey, student);
      return student;
    } catch (error) {
      console.error(`Error getting student with studentId ${studentId}:`, error);
      throw new Error("Failed to fetch student");
    }
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    try {
      const newStudent = new this.StudentModel(student);
      const savedDoc = await newStudent.save();
      
      this.invalidateCache();
      return this.convertToStudent(savedDoc);
    } catch (error) {
      console.error("Error creating student:", error);
      throw new Error("Failed to create student");
    }
  }

  async updateStudent(id: number, studentData: Partial<InsertStudent>): Promise<Student | undefined> {
    try {
      // Find student by our generated ID
      const student = await this.getStudent(id);
      
      if (!student) {
        return undefined;
      }
      
      // Update by studentId which is unique in MongoDB
      const updatedDoc = await this.StudentModel.findOneAndUpdate(
        { studentId: student.studentId },
        studentData,
        { new: true }
      ).exec();
      
      if (!updatedDoc) {
        return undefined;
      }
      
      this.invalidateCache();
      return this.convertToStudent(updatedDoc);
    } catch (error) {
      console.error(`Error updating student with id ${id}:`, error);
      throw new Error("Failed to update student");
    }
  }

  async deleteStudent(id: number): Promise<boolean> {
    try {
      // Find student by our generated ID
      const student = await this.getStudent(id);
      
      if (!student) {
        return false;
      }
      
      // Delete by studentId which is unique in MongoDB
      const result = await this.StudentModel.deleteOne({ studentId: student.studentId }).exec();
      
      this.invalidateCache();
      return result.deletedCount === 1;
    } catch (error) {
      console.error(`Error deleting student with id ${id}:`, error);
      throw new Error("Failed to delete student");
    }
  }

  async getStudentStats(): Promise<StudentStats> {
    const cacheKey = 'studentStats';
    const cachedData = this.getCached<StudentStats>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    try {
      const totalStudents = await this.StudentModel.countDocuments();
      const activeStudents = await this.StudentModel.countDocuments({ status: 'active' });
      const pendingApprovals = await this.StudentModel.countDocuments({ status: 'pending' });
      
      // For issues reported, we'll use a count of inactive students as a proxy
      // In a real app, you might have a separate collection for issues
      const issuesReported = await this.StudentModel.countDocuments({ status: 'inactive' });
      
      const stats: StudentStats = {
        totalStudents,
        activeStudents,
        pendingApprovals,
        issuesReported
      };
      
      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error("Error getting student stats:", error);
      throw new Error("Failed to fetch student statistics");
    }
  }
  
  // User Authentication Methods
  async getUser(id: number): Promise<User | undefined> {
    const cacheKey = `user:${id}`;
    const cachedData = this.getCached<User>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    try {
      // Since we're converting ObjectId to numeric ID, we need to fetch all users and find by our generated ID
      const users = await this.UserModel.find().exec();
      const user = users.find(u => parseInt(u._id.toString().substring(0, 8), 16) === id);
      
      if (!user) {
        return undefined;
      }
      
      const convertedUser = this.convertToUser(user);
      this.setCache(cacheKey, convertedUser);
      return convertedUser;
    } catch (error) {
      console.error(`Error getting user with id ${id}:`, error);
      throw new Error("Failed to fetch user");
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const cacheKey = `userByUsername:${username}`;
    const cachedData = this.getCached<User>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    try {
      const user = await this.UserModel.findOne({ username }).exec();
      
      if (!user) {
        return undefined;
      }
      
      const convertedUser = this.convertToUser(user);
      this.setCache(cacheKey, convertedUser);
      return convertedUser;
    } catch (error) {
      console.error(`Error getting user with username ${username}:`, error);
      throw new Error("Failed to fetch user");
    }
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    try {
      const newUser = new this.UserModel(userData);
      const savedUser = await newUser.save();
      
      this.invalidateCache();
      return this.convertToUser(savedUser);
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const user = await this.getUser(id);
      
      if (!user) {
        return undefined;
      }
      
      // Find the MongoDB document using the user's generated ID
      const users = await this.UserModel.find().exec();
      const userDoc = users.find(u => parseInt(u._id.toString().substring(0, 8), 16) === id);
      
      if (!userDoc) {
        return undefined;
      }
      
      // Update the user
      const updatedDoc = await this.UserModel.findByIdAndUpdate(
        userDoc._id,
        userData,
        { new: true }
      ).exec();
      
      if (!updatedDoc) {
        return undefined;
      }
      
      this.invalidateCache();
      return this.convertToUser(updatedDoc);
    } catch (error) {
      console.error(`Error updating user with id ${id}:`, error);
      throw new Error("Failed to update user");
    }
  }
}

// Fallback to in-memory storage if MongoDB connection fails
export class MemStorage implements IStorage {
  private students: Map<number, Student>;
  private users: Map<number, User>;
  private currentId: number;
  private currentStudentIdNum: number;
  private currentUserId: number;
  public sessionStore: session.Store;

  constructor() {
    this.students = new Map();
    this.users = new Map();
    this.currentId = 1;
    this.currentStudentIdNum = 10001;
    this.currentUserId = 1;
    
    // Create memory store for sessions
    const MemoryStore = require('memorystore')(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  async getStudents(filters: StudentFilters = {}): Promise<Student[]> {
    let students = Array.from(this.students.values());
    
    // Apply filters
    if (filters.status && filters.status !== 'all') {
      students = students.filter(s => s.status === filters.status);
    }
    
    if (filters.grade && filters.grade !== 0) {
      students = students.filter(s => s.grade === filters.grade);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      students = students.filter(s => 
        s.firstName.toLowerCase().includes(searchLower) ||
        s.lastName.toLowerCase().includes(searchLower) ||
        s.email.toLowerCase().includes(searchLower) ||
        s.studentId.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply sorting
    if (filters.sort) {
      const [field, direction] = filters.sort.split('_');
      const sortMultiplier = direction === 'asc' ? 1 : -1;
      
      if (field === 'name') {
        students.sort((a, b) => {
          const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
          return sortMultiplier * nameA.localeCompare(nameB);
        });
      } else if (field === 'id') {
        students.sort((a, b) => {
          return sortMultiplier * a.studentId.localeCompare(b.studentId);
        });
      }
    } else {
      // Default sort by name
      students.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }
    
    // Apply pagination
    if (filters.page && filters.limit) {
      const start = (filters.page - 1) * filters.limit;
      const end = start + filters.limit;
      students = students.slice(start, end);
    }
    
    return students;
  }

  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getStudentById(studentId: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(s => s.studentId === studentId);
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const id = this.currentId++;
    const studentId = student.studentId || `ST${this.currentStudentIdNum++}`;
    
    // We need to validate status to ensure it's one of the allowed values
    let status: "active" | "inactive" | "pending" = "active";
    if (student.status && ["active", "inactive", "pending"].includes(student.status)) {
      status = student.status as "active" | "inactive" | "pending";
    }
    
    // Ensure all required fields are set
    const newStudent: Student = {
      id,
      studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      grade: student.grade,
      phone: student.phone || null,
      classSection: student.classSection || null,
      address: student.address || null,
      notes: student.notes || null,
      status: status,
      userId: null // Will be linked to a user account if needed
    };
    
    this.students.set(id, newStudent);
    return newStudent;
  }

  async updateStudent(id: number, studentData: Partial<InsertStudent>): Promise<Student | undefined> {
    const student = this.students.get(id);
    
    if (!student) {
      return undefined;
    }
    
    // Handle status field specially if it's being updated
    let status = student.status;
    if (studentData.status && ["active", "inactive", "pending"].includes(studentData.status)) {
      status = studentData.status as "active" | "inactive" | "pending";
    }
    
    // Create a copy of studentData without the status field
    const { status: _, ...otherData } = studentData;
    
    const updatedStudent: Student = {
      ...student,
      ...otherData,
      status // Use our validated status
    };
    
    this.students.set(id, updatedStudent);
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<boolean> {
    return this.students.delete(id);
  }

  async getStudentStats(): Promise<StudentStats> {
    const students = Array.from(this.students.values());
    
    return {
      totalStudents: students.length,
      activeStudents: students.filter(s => s.status === 'active').length,
      pendingApprovals: students.filter(s => s.status === 'pending').length,
      issuesReported: students.filter(s => s.status === 'inactive').length
    };
  }
  
  // User Authentication Methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    
    // Validate role to ensure it's one of the allowed values
    let role: "admin" | "student" = "student";
    if (userData.role && ["admin", "student"].includes(userData.role)) {
      role = userData.role as "admin" | "student";
    }
    
    const newUser: User = {
      id,
      username: userData.username,
      password: userData.password,
      role: role,
      createdAt: new Date(),
      lastLogin: null
    };
    
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = {
      ...user,
      ...userData
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
}

// Export the storage instance
let storage: IStorage;

try {
  storage = new MongoStorage();
} catch (error) {
  console.warn("Failed to initialize MongoDB, falling back to in-memory storage:", error);
  storage = new MemStorage();
  
  // Add some initial data for development purposes
  (async () => {
    // Create an admin user with plain text password for development
    const adminUser = await storage.createUser({
      username: "admin",
      password: "password", // Plain text for development only
      role: "admin"
    });

    // Create a student user with plain text password for development
    const studentUser = await storage.createUser({
      username: "student",
      password: "password", // Plain text for development only
      role: "student"
    });
    
    // Create sample students
    // Create a student and link it to the student user
    const studentData = {
      studentId: "ST10023",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "123-456-7890",
      grade: 10,
      classSection: "10A",
      status: "active",
      address: "123 Main St",
      notes: "Honor roll student"
    };
    
    // Just create the student (we'll handle user links differently)
    const student = await storage.createStudent(studentData);
    
    await storage.createStudent({
      studentId: "ST10024",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      phone: "123-456-7891",
      grade: 11,
      classSection: "11B",
      status: "active",
      address: "456 Oak Ave",
      notes: ""
    });
    
    console.log("Demo accounts created:");
    console.log(" - Admin:   username: admin,   password: password");
    console.log(" - Student: username: student, password: password");
  })();
}

export { storage };
