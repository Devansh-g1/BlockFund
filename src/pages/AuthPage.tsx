
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { User, Lock, Mail } from 'lucide-react';

// Import LucideIcons dynamically
import { icons } from 'lucide-react';
const GoogleIcon = icons.Google || icons.LogIn;

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/profile');
      }
    };
    
    checkSession();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/profile'
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Google Sign In Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName
            }
          }
        });

        if (error) throw error;
        
        toast({
          title: 'Account Created',
          description: 'Please check your email to confirm your account.',
          variant: 'default'
        });
        
        if (data.session) {
          navigate('/profile');
        }
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
        
        toast({
          title: 'Logged In',
          description: 'Welcome back to BlockFund!',
          variant: 'default'
        });
        
        navigate('/profile');
      }
    } catch (error: any) {
      toast({
        title: 'Authentication Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isSignup 
              ? 'Join BlockFund and start your crowdfunding journey' 
              : 'Sign in to continue to BlockFund'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignup && (
            <div>
              <label htmlFor="display-name" className="sr-only">Display Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input 
                  id="display-name"
                  type="text" 
                  placeholder="Display Name" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={isSignup}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input 
                id="email"
                type="email" 
                placeholder="Email Address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input 
                id="password"
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                className="pl-10"
                minLength={6}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading 
              ? (isSignup ? 'Creating Account...' : 'Signing In...') 
              : (isSignup ? 'Create Account' : 'Sign In')
            }
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <Button 
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <GoogleIcon className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>
        </form>

        <div className="text-center">
          <p className="text-muted-foreground">
            {isSignup 
              ? 'Already have an account? ' 
              : 'Don\'t have an account? '}
            <button 
              onClick={() => setIsSignup(!isSignup)}
              className="text-primary hover:underline focus:outline-none"
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
