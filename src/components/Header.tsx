
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useWeb3 } from '@/context/Web3Context';
import { useWeb3Extended } from '@/context/Web3ContextExtended';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/use-theme';
import { truncateAddress } from '@/utils/contractUtils';
import { 
  Moon, 
  Sun, 
  User, 
  LogOut, 
  LogIn, 
  Plus, 
  ChevronDown,
  Wallet,
  DollarSign,
  Target 
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Header = () => {
  const navigate = useNavigate();
  const { connectWallet, isConnected, address, balance } = useWeb3();
  const { isVerifiedCreator, isSuperVerified } = useWeb3Extended();
  const { theme, toggleTheme } = useTheme();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in and fetch profile data
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsUserLoggedIn(true);
        
        // Fetch profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileData) {
          setUserProfile(profileData);
        }
      } else {
        setIsUserLoggedIn(false);
        setUserProfile(null);
      }
    };

    fetchUserData();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setIsUserLoggedIn(true);
          fetchUserData();
        } else {
          setIsUserLoggedIn(false);
          setUserProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleConnectWallet = async () => {
    if (!isUserLoggedIn) {
      navigate('/auth');
      return;
    }
    
    await connectWallet();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16 mx-auto px-4">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-md flex items-center justify-center">
            <span className="text-white font-bold">BF</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            BlockFund
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-foreground hover:text-primary font-medium">
            Campaigns
          </Link>
          <Link to="/about" className="text-foreground hover:text-primary font-medium">
            About
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          {isConnected && isUserLoggedIn && (
            <Button 
              variant="outline" 
              size="sm" 
              className="hidden sm:flex items-center gap-2"
              onClick={() => navigate('/create-campaign')}
            >
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            className="text-foreground hover:bg-accent"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {isUserLoggedIn ? (
            <div className="flex items-center space-x-3">
              {/* Profile dropdown menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative p-0 h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      {userProfile?.avatar_url ? (
                        <AvatarImage src={userProfile.avatar_url} alt={userProfile.display_name || 'User'} />
                      ) : (
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {userProfile?.display_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col p-2">
                    <p className="text-sm font-medium">{userProfile?.display_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">Profile</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center gap-2" onClick={() => navigate('/profile')}>
                    <User className="h-4 w-4" />
                    <span>My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2" onClick={() => navigate('/profile')}>
                    <Target className="h-4 w-4" />
                    <span>My Campaigns ({userProfile?.campaigns_created || 0})</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2" onClick={() => navigate('/profile')}>
                    <DollarSign className="h-4 w-4" />
                    <span>Donations (${userProfile?.total_donated?.toFixed(2) || '0.00'})</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center gap-2" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Wallet connection status */}
              {isConnected ? (
                <div className="flex items-center space-x-3">
                  <span className="hidden md:block text-sm font-medium text-foreground">
                    {parseFloat(balance).toFixed(4)} ETH
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="hidden sm:flex items-center gap-1"
                  >
                    {isSuperVerified && (
                      <span className="bg-green-500 text-white text-xs px-1 rounded">Gov</span>
                    )}
                    {truncateAddress(address || '')}
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleConnectWallet} 
                  variant="default" 
                  className="bg-primary hover:bg-primary/90"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect Wallet
                </Button>
              )}
            </div>
          ) : (
            <Button 
              onClick={() => navigate('/auth')} 
              variant="default" 
              className="bg-primary hover:bg-primary/90"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
