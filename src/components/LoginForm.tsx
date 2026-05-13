import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LoginFormProps {
  onToggleMode: () => void;
  isCreateAccount: boolean;
  onForgotPassword?: () => void;
  isResetMode?: boolean;
}

interface Player {
  player_id: number;
  player_name: string;
}

const LoginForm = ({ onToggleMode, isCreateAccount, onForgotPassword, isResetMode }: LoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load roster when creating account and role is "player"
  useEffect(() => {
    if (isCreateAccount && selectedRole === "player") {
      supabase
        .from("players")
        .select("player_id, player_name")
        .order("player_name")
        .then(({ data }) => setPlayers(data ?? []));
    }
  }, [isCreateAccount, selectedRole]);

  // Reset selections when toggling mode
  useEffect(() => {
    setSelectedRole("");
    setSelectedPlayerId("");
  }, [isCreateAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isCreateAccount) {
        if (!selectedRole) {
          toast({ title: "Error", description: "Please select your role.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        if (selectedRole === "player" && !selectedPlayerId) {
          toast({ title: "Error", description: "Please select your name from the roster.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const isAdminSignup = selectedRole === "admin";
        const selectedPlayer = !isAdminSignup ? players.find((p) => String(p.player_id) === selectedPlayerId) : null;
        const displayName = isAdminSignup ? "Admin" : selectedPlayer?.player_name;
        const { error } = await signUp(email, password, displayName);
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
          // Assign role server-side (service role) so admin/coach gets creator
          // and player gets user. Also links player_id to profile if applicable.
          const appRole = isAdminSignup ? "creator" : "user";
          const playerIdNum = !isAdminSignup && selectedPlayerId ? Number(selectedPlayerId) : null;
          try {
            const { error: fnErr } = await supabase.functions.invoke("assign-role", {
              body: { role: appRole, player_id: playerIdNum },
            });
            if (fnErr) {
              toast({
                title: "Role assignment failed",
                description: fnErr.message ?? "Please contact an admin.",
                variant: "destructive",
              });
            }
          } catch (e) {
            toast({
              title: "Role assignment failed",
              description: e instanceof Error ? e.message : "Unknown error",
              variant: "destructive",
            });
          }

          toast({ title: "Account created!", description: "You can now sign in with your credentials." });
          onToggleMode();
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
          const { data: { user: loggedInUser } } = await supabase.auth.getUser();
          if (loggedInUser) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("player_id")
              .eq("id", loggedInUser.id)
              .maybeSingle();
            if (profileData?.player_id) {
              navigate("/player-data");
            } else {
              navigate("/dashboard");
            }
          } else {
            navigate("/dashboard");
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isResetMode && isCreateAccount && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm">
          <p className="font-semibold text-foreground mb-1">Resetting your account</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Pick <span className="font-medium text-foreground">Player</span> and select your name from the roster, then enter a new email and password. This replaces your previous login for that player.
          </p>
        </div>
      )}
      {isCreateAccount && (
        <>
          {/* Role selector */}
          <div className="space-y-2">
            <Label className="text-foreground/90 text-sm font-medium">
              Select Your Role
            </Label>
            <Select value={selectedRole} onValueChange={(val) => { setSelectedRole(val); setSelectedPlayerId(""); }}>
              <SelectTrigger className="h-12 bg-input border-border">
                <SelectValue placeholder="Are you a Player or Admin?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="admin">Admin / Coach</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Player name selector — only shown when role is "player" */}
          {selectedRole === "player" && (
            <div className="space-y-2">
              <Label className="text-foreground/90 text-sm font-medium">
                Select Your Name
              </Label>
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger className="h-12 bg-input border-border">
                  <SelectValue placeholder="Choose your name from the roster" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.player_id} value={String(p.player_id)}>
                      {p.player_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-foreground/90 text-sm font-medium">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-11 h-12 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-kstate-purple-light input-glow transition-all"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-foreground/90 text-sm font-medium">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-11 pr-11 h-12 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-kstate-purple-light input-glow transition-all"
            required
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            disabled={isLoading}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {!isCreateAccount && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-kstate-silver hover:text-foreground transition-colors"
          >
            Forgot password?
          </button>
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 bg-primary hover:bg-kstate-purple-light text-primary-foreground font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl group"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            {isCreateAccount ? "Create Account" : "Sign In"}
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </Button>

      <div className="text-center pt-2">
        <span className="text-muted-foreground text-sm">
          {isCreateAccount ? "Already have an account?" : "Don't have an account?"}
        </span>
        <button
          type="button"
          onClick={onToggleMode}
          className="ml-2 text-kstate-silver hover:text-foreground font-medium transition-colors text-sm"
          disabled={isLoading}
        >
          {isCreateAccount ? "Sign In" : "Create Account"}
        </button>
      </div>
    </form>
  );
};

export default LoginForm;
