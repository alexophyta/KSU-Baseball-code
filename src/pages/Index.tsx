import { useState } from "react";
import LoginForm from "@/components/LoginForm";
import kstateLogo from "@/assets/kstate-logo.svg";
import powercatLogo from "@/assets/powercat-logo.png";

const Index = () => {
  const [isCreateAccount, setIsCreateAccount] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  const handleToggleMode = () => {
    setIsCreateAccount(!isCreateAccount);
    setIsResetMode(false);
  };

  const handleForgotPassword = () => {
    setIsCreateAccount(true);
    setIsResetMode(true);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-kstate relative overflow-hidden">
        {/* Powercat logo as background */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src={powercatLogo} 
            alt="" 
            className="w-[120%] h-[120%] object-contain opacity-15"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <img 
            src={kstateLogo} 
            alt="Kansas State University" 
            className="w-full max-w-md mb-8"
          />
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
              Baseball Analytics
            </h1>
            <p className="text-lg text-white/70 max-w-sm">
              Advanced performance insights and data-driven strategies for Wildcat Baseball
            </p>
          </div>

        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <img 
              src={kstateLogo} 
              alt="Kansas State University" 
              className="h-12 mx-auto mb-4"
              style={{ filter: 'invert(10%) sepia(60%) saturate(3000%) hue-rotate(250deg) brightness(40%)' }}
            />
            <h2 className="text-xl font-bold text-primary">Baseball Analytics</h2>
          </div>

          {/* Form card */}
          <div className="bg-card rounded-2xl p-8 shadow-xl border border-border">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">
                {isResetMode ? "Reset Account" : isCreateAccount ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="text-muted-foreground mt-2">
                {isResetMode
                  ? "Create a fresh login for your player profile"
                  : isCreateAccount
                  ? "Sign up to access Kansas State Baseball Analytics"
                  : "Sign in to continue to your dashboard"}
              </p>
            </div>

            <LoginForm
              onToggleMode={handleToggleMode}
              isCreateAccount={isCreateAccount}
              onForgotPassword={handleForgotPassword}
              isResetMode={isResetMode}
            />
          </div>

          {/* Footer */}
          <p className="text-center text-muted-foreground text-sm mt-8">
            © {new Date().getFullYear()} Kansas State University Athletics
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
