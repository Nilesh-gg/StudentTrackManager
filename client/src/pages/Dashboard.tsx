import { useQuery } from "@tanstack/react-query";
import { StudentStats } from "@shared/schema";
import StatCard from "@/components/stats/StatCard";
import { Link } from "wouter";
import { UsersRound, CheckCircle, AlertCircle, Info } from "lucide-react";
import StudentTable from "@/components/student/StudentTable";

export default function Dashboard() {
  const { data: stats, isLoading: isLoadingStats } = useQuery<StudentStats>({
    queryKey: ['/api/stats'],
  });
  
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['/api/students', { limit: 5 }],
  });
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      
      {/* Statistics Cards */}
      <div className="mt-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Students"
            value={isLoadingStats ? "Loading..." : stats?.totalStudents.toString() || "0"}
            icon={<UsersRound />}
            color="primary"
            linkText="View all"
            linkHref="/students"
          />
          
          <StatCard 
            title="Active Students"
            value={isLoadingStats ? "Loading..." : stats?.activeStudents.toString() || "0"}
            icon={<CheckCircle />}
            color="success"
            linkText="View details"
            linkHref="/students?status=active"
          />
          
          <StatCard 
            title="Pending Approvals"
            value={isLoadingStats ? "Loading..." : stats?.pendingApprovals.toString() || "0"}
            icon={<AlertCircle />}
            color="warning"
            linkText="Process now"
            linkHref="/students?status=pending"
          />
          
          <StatCard 
            title="Issues Reported"
            value={isLoadingStats ? "Loading..." : stats?.issuesReported.toString() || "0"}
            icon={<Info />}
            color="error"
            linkText="Resolve issues"
            linkHref="/students?status=inactive"
          />
        </div>
      </div>
      
      {/* Recent Students */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg leading-6 font-medium text-gray-900">Recent Students</h2>
          <Link href="/students">
            <a className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary hover:text-indigo-700">
              View all students
            </a>
          </Link>
        </div>
        
        <StudentTable 
          students={students || []} 
          isLoading={isLoadingStudents}
          showPagination={false}
        />
      </div>
    </div>
  );
}
