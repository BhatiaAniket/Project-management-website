import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Camera, Mail, Building, Briefcase, Phone, MapPin, User, Save, Loader2 } from 'lucide-react';
import { companyAPI } from '../../api/company';
import { showToast } from '../../components/Toast';

export default function ManagerProfile() {
  const { user } = useAuth();
  // Using updatePerson for themselves?
  // Wait, managers might be able to update their own contactNumber etc via an API.
  // We'll mimic a form that displays info readonly or allows minor updates.
  const [profile, setProfile] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    contactNumber: user?.contactNumber || '',
    department: user?.department || '',
    position: user?.position || '',
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold font-heading">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your personal information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: Avatar & summary */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center h-fit">
          <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center text-4xl text-blue-700 font-bold mb-4 relative group cursor-pointer overflow-hidden">
            {profile.fullName.charAt(0)}
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white mb-1" />
              <span className="text-[10px] text-white font-medium">Change Photo</span>
            </div>
          </div>
          <h2 className="text-xl font-bold">{profile.fullName}</h2>
          <p className="text-sm text-muted-foreground capitalize mb-2">Manager</p>
          <span className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-medium">Active</span>
        </div>

        {/* Right Col: Details Form */}
        <div className="md:col-span-2 bg-card border border-border rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 border-b border-border pb-4">
            <User className="w-5 h-5 text-muted-foreground" /> Personal Details
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input readOnly value={profile.fullName} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input readOnly value={profile.email} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input readOnly value={profile.contactNumber || 'Not provided'} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Department</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input readOnly value={profile.department || 'General'} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm outline-none" />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <p className="text-xs text-muted-foreground italic">Contact your Company Admin to update these details.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
