'use client';

import React, { useState, useEffect } from 'react';
import { Settings, AlertCircle, LogIn, LogOut, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Format date for cycle labels
const formatCycleLabel = (date) => {
  const month = date.toLocaleString('default', { month: 'long' });
  const isFirstHalf = date.getDate() <= 15;
  return `${isFirstHalf ? 'First' : 'Second'} half of ${month} ${date.getFullYear()}`;
};

const WorkHoursTracker = () => {
  // New state for client-side rendering
  const [isClient, setIsClient] = useState(false);

  // User state
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState({});
  const [rememberMe, setRememberMe] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // App state
  const [settings, setSettings] = useState({
    hourlyRate: 0,
    dailyHours: 6.5,
    workingDays: 10,
    targetHoursPerCycle: 65
  });

  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({
    date: '',
    clockIn: '',
    clockOut: '',
  });

  // New effect to set client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load user data on mount
  useEffect(() => {
    // Check for client-side before accessing localStorage
    if (!isClient) return;

    const remembered = localStorage.getItem('rememberUser');
    const session = sessionStorage.getItem('currentUser');
    if (remembered || session) {
      setCurrentUser(remembered || session);
    }

    const savedUsers = localStorage.getItem('workHoursUsers');
    if (savedUsers) {
      try {
        setUsers(JSON.parse(savedUsers));
      } catch (error) {
        console.error('Error loading saved users:', error);
      }
    }
  }, [isClient]);

  // Load user settings when logged in
  useEffect(() => {
    if (currentUser && users[currentUser]) {
      setSettings(users[currentUser].settings || settings);
      setEntries(users[currentUser].entries || []);
    }
  }, [currentUser, users]);

  // Save changes to localStorage
  useEffect(() => {
    // Check for client-side and current user before saving
    if (!isClient || !currentUser) return;

    const updatedUsers = {
      ...users,
      [currentUser]: {
        ...users[currentUser],
        settings,
        entries
      }
    };
    localStorage.setItem('workHoursUsers', JSON.stringify(updatedUsers));
  }, [isClient, currentUser, settings, entries]);

  // Check for client-side rendering
  if (!isClient) {
    return null;
  }

  const handleLogin = (e) => {
    e.preventDefault();
    const { username, password } = loginData;
    
    if (users[username]?.password === password) {
      if (rememberMe) {
        localStorage.setItem('rememberUser', username);
      } else {
        sessionStorage.setItem('currentUser', username);
      }
      setCurrentUser(username);
      setLoginError('');
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    const { username, password } = loginData;

    if (!username || !password) {
      setLoginError('Please enter both username and password');
      return;
    }

    if (users[username]) {
      setLoginError('Username already exists');
      return;
    }

    const newUser = {
      password,
      settings: {
        hourlyRate: 0,
        dailyHours: 6.5,
        workingDays: 10,
        targetHoursPerCycle: 65
      },
      entries: []
    };

    setUsers(prev => ({
      ...prev,
      [username]: newUser
    }));

    if (rememberMe) {
      localStorage.setItem('rememberUser', username);
    } else {
      sessionStorage.setItem('currentUser', username);
    }
    
    setCurrentUser(username);
    setLoginError('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rememberUser');
    sessionStorage.removeItem('currentUser');
  };

  const calculateHours = (clockIn, clockOut) => {
    const [inHours, inMinutes] = clockIn.split(':').map(Number);
    const [outHours, outMinutes] = clockOut.split(':').map(Number);
    const totalMinutes = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
    return totalMinutes / 60;
  };

  const handleAddEntry = (e) => {
    e.preventDefault();
    
    if (!newEntry.date || !newEntry.clockIn || !newEntry.clockOut) {
      alert('Please fill in all fields');
      return;
    }

    const hours = calculateHours(newEntry.clockIn, newEntry.clockOut);
    
    if (hours <= 0) {
      alert('Clock Out time must be after Clock In time');
      return;
    }

    setEntries(prev => [...prev, {
      ...newEntry,
      hours,
      id: Date.now()
    }]);

    setNewEntry({
      date: '',
      clockIn: '',
      clockOut: '',
    });
  };

  // Calculate current cycle stats
  const currentCycleStats = (() => {
    // Check for client-side before calculating
    if (!isClient) return {
      totalHours: 0,
      remainingHours: 0,
      earnings: 0,
      cycleLabel: ''
    };

    const today = new Date();
    const isFirstHalf = today.getDate() <= 15;
    const cycleStart = new Date(today.getFullYear(), today.getMonth(), isFirstHalf ? 1 : 16);
    const cycleEnd = new Date(today.getFullYear(), today.getMonth(), isFirstHalf ? 15 : 31);

    const cycleEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= cycleStart && entryDate <= cycleEnd;
    });

    const totalHours = cycleEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const remainingHours = Math.max(0, settings.targetHoursPerCycle - totalHours);
    const earnings = totalHours * settings.hourlyRate;

    return {
      totalHours,
      remainingHours,
      earnings,
      cycleLabel: formatCycleLabel(today)
    };
  })();

  // Login form
  if (!currentUser) {
    return (
      <div className="container mx-auto p-4 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Work Hours Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <Input
                  type="text"
                  value={loginData.username}
                  onChange={e => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <Input
                  type="password"
                  value={loginData.password}
                  onChange={e => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={checked => setRememberMe(checked === true)}
                />
                <label htmlFor="rememberMe" className="text-sm font-medium">
                  Remember me
                </label>
              </div>
              {loginError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <Button onClick={handleLogin} className="flex-1">
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
                <Button onClick={handleRegister} variant="outline" className="flex-1">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main interface
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Welcome, {currentUser}</h2>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hourly Rate ($)</label>
              <Input
                type="number"
                value={settings.hourlyRate}
                onChange={e => setSettings(prev => ({
                  ...prev,
                  hourlyRate: parseFloat(e.target.value) || 0
                }))}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Daily Working Hours</label>
              <Input
                type="number"
                value={settings.dailyHours}
                onChange={e => {
                  const dailyHours = parseFloat(e.target.value) || 0;
                  setSettings(prev => ({
                    ...prev,
                    dailyHours,
                    targetHoursPerCycle: dailyHours * prev.workingDays
                  }));
                }}
                min="0"
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Working Days per Cycle</label>
              <Input
                type="number"
                value={settings.workingDays}
                onChange={e => {
                  const workingDays = parseInt(e.target.value) || 0;
                  setSettings(prev => ({
                    ...prev,
                    workingDays,
                    targetHoursPerCycle: prev.dailyHours * workingDays
                  }));
                }}
                min="0"
              />
            </div>
          </div>
          <div className="mt-4 p-4 bg-secondary rounded-lg">
            <h3 className="font-medium mb-1">Target Hours Per Half-Month</h3>
            <p className="text-2xl font-bold">
              {settings.targetHoursPerCycle.toFixed(1)} hours
            </p>
            <p className="text-sm text-muted-foreground">
              ({settings.dailyHours} hours × {settings.workingDays} days)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current Cycle Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Cycle - {currentCycleStats.cycleLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-secondary rounded-lg">
              <h3 className="font-medium mb-1">Hours Worked</h3>
              <p className="text-2xl font-bold">{currentCycleStats.totalHours.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">of {settings.targetHoursPerCycle} target hours</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <h3 className="font-medium mb-1">Hours Remaining</h3>
              <p className="text-2xl font-bold">{currentCycleStats.remainingHours.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">to reach target</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <h3 className="font-medium mb-1">Earnings</h3>
              <p className="text-2xl font-bold">${currentCycleStats.earnings.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">this cycle</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Entry Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>New Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <Input
                type="date"
                value={newEntry.date}
                onChange={e => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Clock In</label>
              <Input
                type="time"
                value={newEntry.clockIn}
                onChange={e => setNewEntry(prev => ({ ...prev, clockIn: e.target.value }))}
              />
            </div>
            <div>

              <label className="block text-sm font-medium mb-1">Date</label>
              <Input
                type="date"
                value={newEntry.date}
                onChange={e => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Clock In</label>
              <Input
                type="time"
                value={newEntry.clockIn}
                onChange={e => setNewEntry(prev => ({ ...prev, clockIn: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Clock Out</label>
              <Input
                type="time"
                value={newEntry.clockOut}
                onChange={e => setNewEntry(prev => ({ ...prev, clockOut: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">Add Entry</Button>
            </div>
          </form>
        </CardContent>
      </Card>

{/* Entries Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Clock In</th>
                  <th className="text-left p-2">Clock Out</th>
                  <th className="text-left p-2">Hours</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.sort((a, b) => new Date(b.date) - new Date(a.date)).map((entry) => (
                  <tr key={entry.id}>
                    <td className="p-2">{entry.date}</td>
                    <td className="p-2">{entry.clockIn}</td>
                    <td className="p-2">{entry.clockOut}</td>
                    <td className="p-2">{entry.hours.toFixed(2)}</td>
                    <td className="p-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setEntries(entries.filter(e => e.id !== entry.id));
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

{/* Analytics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Hours Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entries
                  .reduce((acc, entry) => {
                    const date = new Date(entry.date);
                    const month = date.toLocaleString('default', { month: 'short' });
                    const period = `${date.getDate() <= 15 ? '1st' : '2nd'} half of ${month}`;
                    
                    const existingPeriod = acc.find(p => p.period === period);
                    if (existingPeriod) {
                      existingPeriod.hours += entry.hours;
                    } else {
                      acc.push({ period, hours: entry.hours });
                    }
                    return acc;
                  }, [])
                  .sort((a, b) => {
                    const [aHalf, , , aMonth] = a.period.split(' ');
                    const [bHalf, , , bMonth] = b.period.split(' ');
                    const aDate = new Date(`${aMonth} 1, 2024`);
                    const bDate = new Date(`${bMonth} 1, 2024`);
                    return aDate - bDate || (aHalf === '1st' ? -1 : 1);
                  })
                  .slice(-6)
                }>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="hours"
                    name="Hours Worked"
                    fill="#8884d8"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Earnings Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entries
                  .reduce((acc, entry) => {
                    const date = new Date(entry.date);
                    const month = date.toLocaleString('default', { month: 'short' });
                    const period = `${date.getDate() <= 15 ? '1st' : '2nd'} half of ${month}`;
                    
                    const existingPeriod = acc.find(p => p.period === period);
                    if (existingPeriod) {
                      existingPeriod.earnings += entry.hours * settings.hourlyRate;
                    } else {
                      acc.push({ period, earnings: entry.hours * settings.hourlyRate });
                    }
                    return acc;
                  }, [])
                  .sort((a, b) => {
                    const [aHalf, , , aMonth] = a.period.split(' ');
                    const [bHalf, , , bMonth] = b.period.split(' ');
                    const aDate = new Date(`${aMonth} 1, 2024`);
                    const bDate = new Date(`${bMonth} 1, 2024`);
                    return aDate - bDate || (aHalf === '1st' ? -1 : 1);
                  })
                  .slice(-6)
                }>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="earnings"
                    name="Earnings ($)"
                    fill="#82ca9d"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkHoursTracker;