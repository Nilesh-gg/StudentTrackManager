import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Student } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import StudentTable from "@/components/student/StudentTable";
import StudentFilters from "@/components/student/StudentFilters";
import StudentForm from "@/components/student/StudentForm";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";

export default function Students() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    status: "all",
    grade: 0,
    search: "",
    sort: "name_asc",
    page: 1,
    limit: 10
  });
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Fetch students with filters
  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ['/api/students', filters],
  });
  
  // Delete student mutation
  const deleteMutation = useMutation({
    mutationFn: async (studentId: number) => {
      await apiRequest('DELETE', `/api/students/${studentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Student deleted",
        description: "The student record has been deleted successfully.",
      });
      setIsDeleteModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete student. Please try again.",
        variant: "destructive",
      });
      console.error("Delete error:", error);
    }
  });
  
  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setIsAddModalOpen(true);
  };
  
  const handleDelete = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };
  
  const confirmDelete = () => {
    if (selectedStudent) {
      deleteMutation.mutate(selectedStudent.id);
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <h1 className="text-2xl font-semibold text-gray-900">Students</h1>
      
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg leading-6 font-medium text-gray-900">Manage Students</h2>
          <Button
            onClick={() => {
              setSelectedStudent(null);
              setIsAddModalOpen(true);
            }}
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Student
          </Button>
        </div>
        
        {/* Filters */}
        <StudentFilters 
          filters={filters}
          onFilterChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))}
        />
        
        {/* Student Table */}
        <StudentTable 
          students={students || []} 
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showPagination={true}
          currentPage={filters.page}
          onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
        />
      </div>
      
      {/* Add/Edit Student Modal */}
      <StudentForm 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        student={selectedStudent}
        onSuccess={() => {
          setIsAddModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['/api/students'] });
          queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        }}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this student record? This action cannot be undone and all data associated with this student will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
