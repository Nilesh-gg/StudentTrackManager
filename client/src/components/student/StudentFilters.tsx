import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StudentFiltersProps {
  filters: {
    status: string;
    grade: number;
    search: string;
    sort: string;
  };
  onFilterChange: (filters: Partial<{
    status: string;
    grade: number;
    search: string;
    sort: string;
  }>) => void;
}

export default function StudentFilters({ filters, onFilterChange }: StudentFiltersProps) {
  const [localFilters, setLocalFilters] = useState({
    status: filters.status,
    grade: filters.grade,
    sort: filters.sort
  });
  
  const handleChange = (field: keyof typeof localFilters, value: string | number) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleApplyFilters = () => {
    onFilterChange(localFilters);
  };
  
  return (
    <div className="bg-white shadow rounded-lg mb-6">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/4">
            <Label htmlFor="filter-status">Status</Label>
            <Select
              value={localFilters.status}
              onValueChange={(value) => handleChange('status', value)}
            >
              <SelectTrigger id="filter-status" className="mt-1">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-1/4">
            <Label htmlFor="filter-grade">Grade</Label>
            <Select
              value={localFilters.grade.toString()}
              onValueChange={(value) => handleChange('grade', parseInt(value, 10))}
            >
              <SelectTrigger id="filter-grade" className="mt-1">
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Grades</SelectItem>
                <SelectItem value="9">Grade 9</SelectItem>
                <SelectItem value="10">Grade 10</SelectItem>
                <SelectItem value="11">Grade 11</SelectItem>
                <SelectItem value="12">Grade 12</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-1/4">
            <Label htmlFor="filter-sort">Sort By</Label>
            <Select
              value={localFilters.sort}
              onValueChange={(value) => handleChange('sort', value)}
            >
              <SelectTrigger id="filter-sort" className="mt-1">
                <SelectValue placeholder="Select sorting" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                <SelectItem value="id_asc">ID (Low-High)</SelectItem>
                <SelectItem value="id_desc">ID (High-Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-1/4 md:self-end">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleApplyFilters}
            >
              <Filter className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
