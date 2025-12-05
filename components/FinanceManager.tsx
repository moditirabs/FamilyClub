import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Wallet, TrendingUp, Users, AlertCircle, Coins } from 'lucide-react';

const dataPie = [
  { name: 'Collected', value: 8500 },
  { name: 'Arrears', value: 1500 },
];

const COLORS = ['#10b981', '#ef4444'];

const dataBar = [
  { name: 'Jan', collected: 2000, expected: 2500 },
  { name: 'Feb', collected: 2200, expected: 2500 },
  { name: 'Mar', collected: 1800, expected: 2500 },
  { name: 'Apr', collected: 2500, expected: 2500 },
];

interface FinanceManagerProps {
  showContributionForm?: boolean;
}

export const FinanceManager: React.FC<FinanceManagerProps> = ({ showContributionForm = true }) => {
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <Wallet className="w-6 h-6 text-green-600" />
        Financial Overview
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">Total Collected</p>
                    <h3 className="text-2xl font-bold text-slate-900">R8,500</h3>
                </div>
                <div className="p-2 bg-green-100 rounded-full text-green-600">
                    <Coins className="w-5 h-5" />
                </div>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">Total Arrears</p>
                    <h3 className="text-2xl font-bold text-red-600">R1,500</h3>
                </div>
                <div className="p-2 bg-red-100 rounded-full text-red-600">
                    <AlertCircle className="w-5 h-5" />
                </div>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">Collection Rate</p>
                    <h3 className="text-2xl font-bold text-blue-600">85%</h3>
                </div>
                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                    <TrendingUp className="w-5 h-5" />
                </div>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">Active Members</p>
                    <h3 className="text-2xl font-bold text-slate-900">24</h3>
                </div>
                <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                    <Users className="w-5 h-5" />
                </div>
            </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[350px] flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Collection Status</h3>
          <div className="flex-1 w-full min-h-0 min-w-0">
            <ResponsiveContainer width="99%" height="100%">
              <PieChart>
                <Pie
                  data={dataPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[350px] flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Monthly Contribution Trends</h3>
          <div className="flex-1 w-full min-h-0 min-w-0">
            <ResponsiveContainer width="99%" height="100%">
              <BarChart
                data={dataBar}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
                <Bar dataKey="collected" fill="#10b981" name="Collected" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expected" fill="#e2e8f0" name="Expected" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Contribution Form Placeholder */}
      {showContributionForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Quick Contribution Entry</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input type="text" placeholder="Member Name" className="p-2 border rounded-lg w-full" />
                <select className="p-2 border rounded-lg w-full">
                    <option>Contribution</option>
                    <option>Fine</option>
                    <option>Event Fee</option>
                </select>
                <input type="number" placeholder="Amount" className="p-2 border rounded-lg w-full" />
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Record Payment</button>
            </div>
        </div>
      )}
    </div>
  );
};