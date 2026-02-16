import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm p-8">
          <h1 className="text-2xl font-semibold text-[#323130] mb-6">Ministry Admin Panel</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-[#323130]">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
                className="mt-1 border-[#e5e5e5] rounded-lg"
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="text-[#323130]">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password-input"
                className="mt-1 border-[#e5e5e5] rounded-lg"
              />
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          
          <div className="mt-6 text-sm text-[#605e5c]">
            <p>Default credentials:</p>
            <p className="font-mono text-xs mt-1">admin@ministry.local / ChangeMe123!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
