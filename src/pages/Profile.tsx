import { BottomSheet } from '../components/common/BottomSheet';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Calendar, Link as LinkIcon, X } from 'lucide-react';
import { FeaturePage } from '../components/layout/FeaturePage';
import { RatingStars } from '../components/gigs/RatingStars';
import { getUserProfile, updateProfile } from '../services/profile';
import { uploadAvatar } from '../services/upload';
import { logout } from '../services/auth';
import { getUniversities, getFaculties, getDepartments } from '../services/onboarding';
import { useUIStore } from '../store/uiStore';
import type { UpdateProfileData } from '../types/profile';
import { accountScope } from '../utils/accountScope';
export function Profile() {
 const navigate = useNavigate(); const client = useQueryClient();
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [editFormData, setEditFormData] = useState<UpdateProfileData>({});
 const [interestInput, setInterestInput] = useState('');
 const [uploadError, setUploadError] = useState(''); const [signingOut, setSigningOut] = useState(false);
 const { darkMode, toggleDarkMode } = useUIStore();
 const profileQuery = useQuery({queryKey:['user-profile', accountScope()],queryFn:getUserProfile});
 const profile = profileQuery.data;
 const {data: universities = []} = useQuery({queryKey:['universities'],queryFn:getUniversities,enabled:isEditModalOpen});
 const {data: faculties = []} = useQuery({queryKey:['faculties',editFormData.university_id],queryFn:()=>getFaculties(editFormData.university_id!),enabled:isEditModalOpen && !!editFormData.university_id});
 const {data: departments = []} = useQuery({queryKey:['departments',editFormData.university_id,editFormData.faculty_id],queryFn:()=>getDepartments(editFormData.university_id!,editFormData.faculty_id!),enabled:isEditModalOpen && !!editFormData.university_id && !!editFormData.faculty_id});
 const updateProfileMutation = useMutation({mutationFn:updateProfile,onSuccess:async()=>{await client.invalidateQueries({queryKey:['user-profile']});setIsEditModalOpen(false);}});
 const updateAvatarMutation = useMutation({mutationFn:uploadAvatar,onSuccess:()=>client.invalidateQueries({queryKey:['user-profile']})});
 const handleEditSubmit = (event: React.FormEvent) => {event.preventDefault();updateProfileMutation.mutate(editFormData);};
 const handleAddInterest = () => {if(interestInput.trim() && (editFormData.interests?.length ?? 0)<10){setEditFormData({...editFormData,interests:[...(editFormData.interests ?? []),interestInput.trim()]});setInterestInput('');}};
 const handleRemoveInterest = (index:number) => setEditFormData({...editFormData,interests:editFormData.interests?.filter((_,i)=>i!==index)});
 const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {const file=event.target.files?.[0];if(!file)return;setUploadError('');if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024||file.size===0){setUploadError('Choose a JPEG, PNG or WebP image under 5 MB.');return;}try{await updateAvatarMutation.mutateAsync(file);}catch{setUploadError('Could not update your avatar. Please try again.');}};
 const handleLogout = async()=>{setSigningOut(true);await logout();navigate('/auth/login',{replace:true});};
 const openEditor = () => {if(!profile)return;setEditFormData({firstname:profile.firstname ?? '',lastname:profile.lastname ?? '',phone:profile.phone ?? '',date_of_birth:profile.date_of_birth ?? '',gender:profile.gender,bio:profile.bio ?? '',interests:profile.interests ?? [],university_id:profile.university?.id,faculty_id:profile.faculty?.id,department_id:profile.department?.id,student_id:profile.student_id,year_of_study:profile.level && /^\d+$/.test(profile.level)?Number(profile.level)/100:undefined,social_links:profile.social_links ?? {}});setIsEditModalOpen(true);};
 return <FeaturePage title="Your profile" description="One UniVybe account. Your identity, community and gig reputation."><div className="mx-auto max-w-3xl space-y-6">
 {profileQuery.isPending ? <p role="status">Loading your profile…</p> : profileQuery.isError || !profile ? <div role="alert" className="earn-empty">We couldn’t load your profile. <button className="underline" onClick={()=>void profileQuery.refetch()}>Try again</button></div> : <>
 <section className="rounded-2xl bg-linear-to-br from-blue-violet-500 to-azure-400 p-6 text-white"><div className="flex flex-wrap items-center gap-5">{profile.avatar_url ? <img src={profile.avatar_url} alt="Your avatar" className="h-20 w-20 rounded-full object-cover"/> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-3xl font-bold">{(profile.firstname || profile.email).slice(0,1).toUpperCase()}</div>}<div><h2 className="text-2xl font-bold">{[profile.firstname,profile.lastname].filter(Boolean).join(' ') || profile.full_name || profile.email}</h2><p className="mt-1">{profile.email}</p></div></div><p className="mt-5">{profile.bio}</p><div className="mt-4 flex flex-wrap gap-2">{profile.interests?.map(interest=><span key={interest} className="rounded-full bg-white/20 px-3 py-1 text-sm">{interest}</span>)}</div><div className="mt-5 flex flex-wrap items-center gap-4"><button className="rounded-xl bg-white px-4 py-2 font-semibold text-blue-violet-400" onClick={openEditor}>Edit profile</button><label className="cursor-pointer text-sm font-semibold underline">{updateAvatarMutation.isPending?'Uploading…':'Change avatar'}<input aria-label="Change avatar" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={updateAvatarMutation.isPending} onChange={handleAvatarUpload}/></label></div>{uploadError && <p role="alert" className="mt-3">{uploadError}</p>}</section>
 <section className="earn-empty"><h2 className="mb-3 text-lg font-bold">Account details</h2><dl className="space-y-2">{[['Phone',profile.phone],['University',profile.university?.name],['Faculty',profile.faculty?.name],['Department',profile.department?.name],['Organization',profile.organization?.name],['Academic level',profile.level]].map(([label,value])=>value && <div key={label}><dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt><dd>{value}</dd></div>)}</dl></section>
 <section className="earn-empty"><h2 className="mb-3 text-lg font-bold">Gig reputation</h2><RatingStars value={profile.gig_reputation?.average_rating ?? null}/><p className="my-3 text-sm">{profile.gig_reputation?.rating_count ?? 0} ratings from gigs.</p>{profile.gig_reputation?.reviews.map(review=><div key={review.id} className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700"><p className="font-semibold">{review.reviewer.name} · as {review.as}</p><RatingStars value={review.rating} size="sm"/>{review.review && <p className="mt-1 text-sm">{review.review}</p>}</div>)}<div className="mt-5 flex flex-wrap gap-4"><Link to="/gigs/interests" className="font-semibold underline">My gig interests</Link><Link to="/gigs/posted" className="font-semibold underline">My posted gigs</Link></div></section>
 </>}
 <section id="settings" className="earn-empty"><h2 className="mb-4 text-lg font-bold">Appearance and account</h2><button aria-pressed={darkMode} onClick={toggleDarkMode} className="earn-button-secondary">{darkMode?'Use light theme':'Use dark theme'}</button><div className="mt-5 flex flex-wrap items-center gap-5"><Link to="/help" className="font-semibold underline">Get help</Link><button className="font-semibold text-rose-400 dark:text-rose-700" disabled={signingOut} onClick={()=>void handleLogout()}>{signingOut?'Signing out…':'Log out'}</button></div></section>
         {/* Edit Profile Modal */}
        {isEditModalOpen && (
          <BottomSheet open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit profile">
              <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Personal Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.firstname || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            firstname: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        maxLength={100}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.lastname || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            lastname: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={editFormData.phone || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            phone: e.target.value,
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="+232 76 123 4567"
                        maxLength={50}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          value={editFormData.date_of_birth || ""}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              date_of_birth: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Gender
                      </label>
                      <select
                        value={editFormData.gender || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            gender: e.target.value as
                              | "male"
                              | "female"
                              | "other"
                              | undefined,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={editFormData.bio || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          bio: e.target.value,
                        })
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                      placeholder="Tell us about yourself..."
                      maxLength={1000}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {(editFormData.bio || "").length} / 1000 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Interests
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddInterest();
                          }
                        }}
                        placeholder="Add an interest"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        maxLength={50}
                      />
                      <button
                        type="button"
                        onClick={handleAddInterest}
                        disabled={
                          !interestInput.trim() ||
                          (editFormData.interests?.length || 0) >= 10
                        }
                        className="px-4 py-2 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editFormData.interests?.map((interest, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-azure-100 dark:bg-azure-900/30 text-azure-700 dark:text-azure-300 rounded-full text-sm"
                        >
                          {interest}
                          <button
                            type="button"
                            onClick={() => handleRemoveInterest(index)}
                            className="hover:text-azure-900 dark:hover:text-azure-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {editFormData.interests?.length || 0} / 10 interests
                    </p>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Academic Information
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      University
                    </label>
                    <select
                      value={editFormData.university_id || ""}
                      onChange={(e) => {
                        const universityId = e.target.value
                          ? parseInt(e.target.value)
                          : undefined;
                        setEditFormData({
                          ...editFormData,
                          university_id: universityId,
                          faculty_id: undefined,
                          department_id: undefined,
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                    >
                      <option value="">Select university</option>
                      {universities.map((uni) => (
                        <option key={uni.id} value={uni.id}>
                          {uni.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {editFormData.university_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Faculty
                      </label>
                      <select
                        value={editFormData.faculty_id || ""}
                        onChange={(e) => {
                          const facultyId = e.target.value
                            ? parseInt(e.target.value)
                            : undefined;
                          setEditFormData({
                            ...editFormData,
                            faculty_id: facultyId,
                            department_id: undefined,
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                      >
                        <option value="">Select faculty</option>
                        {faculties.map((faculty) => (
                          <option key={faculty.id} value={faculty.id}>
                            {faculty.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {editFormData.faculty_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Department
                      </label>
                      <select
                        value={editFormData.department_id || ""}
                        onChange={(e) => {
                          const departmentId = e.target.value
                            ? parseInt(e.target.value)
                            : undefined;
                          setEditFormData({
                            ...editFormData,
                            department_id: departmentId,
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                      >
                        <option value="">Select department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Student ID
                      </label>
                      <input
                        type="text"
                        value={editFormData.student_id || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            student_id: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        maxLength={50}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Year of Study
                      </label>
                      <input
                        type="number"
                        value={editFormData.year_of_study || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            year_of_study: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          })
                        }
                        min={1}
                        max={10}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Social Links
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      LinkedIn
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={editFormData.social_links?.linkedin || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            social_links: {
                              ...editFormData.social_links,
                              linkedin: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Twitter
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={editFormData.social_links?.twitter || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            social_links: {
                              ...editFormData.social_links,
                              twitter: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="https://twitter.com/username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GitHub
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={editFormData.social_links?.github || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            social_links: {
                              ...editFormData.social_links,
                              github: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="https://github.com/username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Portfolio
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={editFormData.social_links?.portfolio || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            social_links: {
                              ...editFormData.social_links,
                              portfolio: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="https://yourportfolio.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Facebook
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={editFormData.social_links?.facebook || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            social_links: {
                              ...editFormData.social_links,
                              facebook: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="https://facebook.com/username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Instagram
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={editFormData.social_links?.instagram || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            social_links: {
                              ...editFormData.social_links,
                              instagram: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="https://instagram.com/username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      TikTok
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={editFormData.social_links?.tiktok || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            social_links: {
                              ...editFormData.social_links,
                              tiktok: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                        placeholder="https://tiktok.com/@username"
                      />
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {updateProfileMutation.error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {updateProfileMutation.error instanceof Error
                        ? updateProfileMutation.error.message
                        : "Failed to update profile. Please try again."}
                    </p>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 px-6 py-3 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
                  >
                    {updateProfileMutation.isPending
                      ? "Saving..."
                      : "Save Changes"}
                  </button>
                </div>
              </form>
          </BottomSheet>
        )}

 </div></FeaturePage>;
}
