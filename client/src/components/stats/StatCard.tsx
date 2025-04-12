import { ReactNode } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  color: "primary" | "success" | "warning" | "error";
  linkText: string;
  linkHref: string;
}

export default function StatCard({
  title,
  value,
  icon,
  color,
  linkText,
  linkHref
}: StatCardProps) {
  const colorMap = {
    primary: "bg-primary",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500"
  };
  
  return (
    <Card className="bg-white overflow-hidden shadow rounded-lg">
      <CardContent className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <div className={cn("flex-shrink-0 rounded-md p-3", colorMap[color])}>
            <div className="h-6 w-6 text-white">
              {icon}
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-semibold text-gray-900">
                {value}
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 px-4 py-4 sm:px-6">
        <div className="text-sm">
          <Link href={linkHref}>
            <a className="font-medium text-primary hover:text-indigo-600">
              {linkText}<span className="sr-only"> {title.toLowerCase()}</span>
            </a>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
