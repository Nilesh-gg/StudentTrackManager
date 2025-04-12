import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertStudentSchema } from "@shared/schema";

// Define validation schemas
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const studentFiltersSchema = z.object({
  status: z.string().optional(),
  grade: z.coerce.number().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // GET /api/stats - Get student statistics
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const stats = await storage.getStudentStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch student statistics" });
    }
  });

  // GET /api/students - Get all students with optional filters
  app.get("/api/students", async (req: Request, res: Response) => {
    try {
      const filterParams = studentFiltersSchema.parse({
        status: req.query.status,
        grade: req.query.grade,
        search: req.query.search,
        sort: req.query.sort,
        page: req.query.page,
        limit: req.query.limit,
      });

      const students = await storage.getStudents(filterParams);
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request parameters",
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // GET /api/students/:id - Get a specific student by ID
  app.get("/api/students/:id", async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse({ id: req.params.id });
      const student = await storage.getStudent(id);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.json(student);
    } catch (error) {
      console.error(`Error fetching student with id ${req.params.id}:`, error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid student ID format",
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });

  // POST /api/students - Create a new student
  app.post("/api/students", async (req: Request, res: Response) => {
    try {
      const studentData = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(studentData);
      res.status(201).json(student);
    } catch (error) {
      console.error("Error creating student:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid student data",
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  // PATCH /api/students/:id - Update a student
  app.patch("/api/students/:id", async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse({ id: req.params.id });
      
      // Partial validation - only validate the fields that are being updated
      const updateData = insertStudentSchema.partial().parse(req.body);
      
      const updatedStudent = await storage.updateStudent(id, updateData);
      
      if (!updatedStudent) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.json(updatedStudent);
    } catch (error) {
      console.error(`Error updating student with id ${req.params.id}:`, error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid student data",
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  // DELETE /api/students/:id - Delete a student
  app.delete("/api/students/:id", async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse({ id: req.params.id });
      const success = await storage.deleteStudent(id);
      
      if (!success) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error(`Error deleting student with id ${req.params.id}:`, error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid student ID format",
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
