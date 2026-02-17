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
      const errorData = error.response?.data;
      const message = errorData?.error?.message || errorData?.detail || 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ministry-bg-primary">
      <div className="w-full max-w-md">
        <div className="bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default shadow-ministry-card p-8">
          <h1 className="text-2xl font-semibold text-ministry-text-primary mb-6">Ministry Admin Panel</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-ministry-text-primary">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
                className="mt-1 border-ministry-border-default rounded-ministry"
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="text-ministry-text-primary">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password-input"
                className="mt-1 border-ministry-border-default rounded-ministry"
              />
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          
          <div className="mt-6 text-sm text-ministry-text-secondary">
            <p>Default credentials:</p>
            <p className="font-mono text-xs mt-1">admin@ministry.local / ChangeMe123!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
