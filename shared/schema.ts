
import { Schema } from 'mongoose';
import { z } from "zod";

// Define status values
export const studentStatusEnum = ["active", "inactive", "pending"] as const;

// Define user role values
export const userRoleEnum = ["admin", "student"] as const;

// Student schema definition
export const StudentSchema = new Schema({
  studentId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  grade: { type: Number, required: true },
  classSection: String,
  address: String,
  notes: String,
  status: { 
    type: String, 
    enum: studentStatusEnum,
    default: "active",
    required: true 
  },
  userId: { type: Schema.Types.ObjectId, ref: 'User' }
});

// User schema definition
export const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String,
    enum: userRoleEnum,
    default: "student",
    required: true 
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

// Zod validation schemas
export const insertStudentSchema = z.object({
  studentId: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  grade: z.number().int().min(1, "Grade must be a positive number"),
  classSection: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(studentStatusEnum).default("active")
});

export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  role: z.enum(userRoleEnum).default("student")
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type Student = z.infer<typeof insertStudentSchema>;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type User = z.infer<typeof insertUserSchema> & { 
  id: string;
  createdAt: Date;
  lastLogin?: Date;
};
export type InsertUser = Omit<z.infer<typeof insertUserSchema>, "confirmPassword">;
export type LoginUser = z.infer<typeof loginSchema>;

// Statistics type
export type StudentStats = {
  totalStudents: number;
  activeStudents: number;
  pendingApprovals: number;
  issuesReported: number;
};
