
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const Login = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-kitloop-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Enter your credentials to sign in to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input id="email" type="email" placeholder="hello@example.com" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Link to="/forgot-password" className="text-sm font-medium text-kitloop-accent hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button className="w-full bg-kitloop-accent hover:bg-kitloop-accent-hover text-white">
            Sign In
          </Button>
          <div className="text-center text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-kitloop-accent hover:underline font-medium">
              Create an account
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
