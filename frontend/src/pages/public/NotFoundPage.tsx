import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Home } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-base text-text-main flex flex-col items-center justify-center p-6 text-center">
      <div className="text-7xl font-display font-extrabold text-brand-orange drop-shadow-md">404</div>
      <h1 className="mt-4 text-2xl font-bold text-text-main">Page Not Found</h1>
      <p className="mt-2 text-sm text-text-muted max-w-sm">
        The destination you requested does not exist or may have been moved.
      </p>
      <div className="mt-6">
        <Link to="/app/home">
          <Button variant="primary" icon={<Home className="w-4 h-4" />}>
            Return to Command Center
          </Button>
        </Link>
      </div>
    </div>
  );
};
