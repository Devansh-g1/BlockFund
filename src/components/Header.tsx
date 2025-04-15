
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useWeb3 } from '@/context/Web3Context';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/use-theme';
import { truncateAddress } from '@/utils/contractUtils';
import { Moon, Sun, User, LogOut, LogIn } from 'lucide-react';

const Header = () => {
  const navigate = useNavigate();
  const { connectWallet, isConnected, address, balance, isVerifiedCreator } = useWeb3();
  const { theme, toggleTheme } = useTheme();

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
          {isConnected && isVerifiedCreator && (
            <Link to="/create-campaign" className="text-foreground hover:text-primary font-medium">
              Create Campaign
            </Link>
          )}
          <Link to="/about" className="text-foreground hover:text-primary font-medium">
            About
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            className="text-foreground hover:bg-accent"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {isConnected ? (
            <div className="flex items-center space-x-3">
              <span className="hidden md:block text-sm font-medium text-foreground">
                {parseFloat(balance).toFixed(4)} ETH
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden sm:flex"
                onClick={() => navigate('/profile')}
              >
                {truncateAddress(address || '')}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSignOut}
                className="text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button 
              onClick={() => navigate('/auth')} 
              variant="default" 
              className="bg-primary hover:bg-primary/90"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Connect
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
