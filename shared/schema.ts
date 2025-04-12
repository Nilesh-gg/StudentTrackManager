import { pgTable, text, serial, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define status values
export const studentStatusEnum = ["active", "inactive", "pending"] as const;

// Define user role values
export const userRoleEnum = ["admin", "student"] as const;

// Student model
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  grade: integer("grade").notNull(),
  classSection: text("class_section"),
  address: text("address"),
  notes: text("notes"),
  status: text("status").$type<typeof studentStatusEnum[number]>().notNull().default("active"),
  // Add reference to user account for login
  userId: integer("user_id"),
});

// User Authentication model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").$type<typeof userRoleEnum[number]>().notNull().default("student"),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
});

// Insert schema for students
export const insertStudentSchema = createInsertSchema(students)
  .omit({ id: true, userId: true })
  .extend({
    email: z.string().email("Please enter a valid email address"),
    grade: z.coerce.number().int().min(1, "Grade must be a positive number"),
    phone: z.string().optional(),
  });

// Insert schema for users
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true, lastLogin: true })
  .extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Login schema for authentication
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = Omit<z.infer<typeof insertUserSchema>, "confirmPassword">;
export type LoginUser = z.infer<typeof loginSchema>;

// Statistics model
export type StudentStats = {
  totalStudents: number;
  activeStudents: number;
  pendingApprovals: number;
  issuesReported: number;
};
