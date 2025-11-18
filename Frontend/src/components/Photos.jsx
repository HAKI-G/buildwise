import React, { useState, useEffect } from "react";
import { Upload, Trash2, Eye, CheckCircle, Image as ImageIcon } from "lucide-react";
import axios from "axios";

const API_URL = "http://localhost:5001/api";

const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token");

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${getToken()}`,
  'Content-Type': 'application/json'
});

const Photos = ({ projectId, readonly = false }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [selectedTask, setSelectedTask] = useState(""); // ✅ Just task selection
  const [tasks, setTasks] = useState([]);
  const [viewModal, setViewModal] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [photoSortOrder, setPhotoSortOrder] = useState("newest"); // 'newest' or 'oldest'
  const [expandedPhases, setExpandedPhases] = useState({}); // Track which phases are expanded

  useEffect(() => {
    if (projectId && showUploadForm) {
      fetchProjectTasks();
    }
  }, [projectId, showUploadForm]);

  useEffect(() => {
    if (projectId) {
      fetchConfirmedPhotosForProject();
    }
  }, [projectId]);

  const fetchProjectTasks = async () => {
    try {
      console.log('📋 Fetching tasks for project:', projectId);
      
      const response = await axios.get(
        `${API_URL}/milestones/project/${projectId}`,
        { headers: getAuthHeaders() }
      );
      
      // ✅ Filter only tasks (not phases)
      const tasksOnly = response.data.filter(item => item.isPhase !== true);
      
      setTasks(tasksOnly);
      console.log(`✅ Loaded ${tasksOnly.length} tasks`);
    } catch (err) {
      console.error("❌ Error fetching tasks:", err);
    }
  };

  const fetchConfirmedPhotosForProject = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      console.log('📷 Fetching confirmed photos for project:', projectId);
      
      const response = await axios.get(
        `${API_URL}/photos/project/${projectId}`,
        { headers: getAuthHeaders() }
      );
      
      const confirmedOnly = response.data.filter(
        photo => photo.confirmationStatus === 'confirmed'
      );
      
      setPhotos(confirmedOnly);
      console.log(`✅ Loaded ${confirmedOnly.length} confirmed photos`);
    } catch (err) {
      console.error("❌ Error fetching photos:", err);
      if (err.response?.status === 401) {
        alert('Session expired. Please login again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      console.log('📁 File selected:', file.name);
    }
  };

  const generateUpdateId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `UPD-${timestamp}-${random}`;
  };

  // ✅ UPDATED: No completion percentage during upload
  const handleUpload = async () => {
    if (!selectedFile || !projectId) {
      alert("Please select a file");
      return;
    }

    if (!selectedTask) {
      alert("Please select a task");
      return;
    }

    setUploading(true);

    const updateId = generateUpdateId();
    console.log('📤 Uploading photo with Update ID:', updateId);

    const taskDetails = tasks.find(t => t.milestoneId === selectedTask);

    const formData = new FormData();
    formData.append("photo", selectedFile); 
    formData.append("caption", caption);
    formData.append("projectId", projectId);
    formData.append("taskId", selectedTask);
    formData.append("taskName", taskDetails?.milestoneName || "Unknown Task");
    // ✅ REMOVED: completionPercentage - AI will suggest it in Reports tab

    try {
      console.log('🚀 Sending to backend for AI analysis...');
      
      const response = await axios.post(
        `${API_URL}/photos/${updateId}`, 
        formData, 
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("✅ Photo uploaded successfully:", response.data);
      console.log("🤖 AI Analysis:", response.data.aiAnalysis);

      // Reset form
      setSelectedFile(null);
      setCaption("");
      setSelectedTask("");
      setShowUploadForm(false);
      document.querySelector('input[type="file"]').value = "";

      // ✅ Enhanced success message with AI percentage
      const aiPercentage = response.data.aiSuggestedPercentage || 
                          response.data.aiAnalysis?.ai_suggestion?.ai_estimated_completion ||
                          null;
      
      setSuccessModal({
        task: taskDetails?.milestoneName,
        updateId: updateId,
        aiPercentage: aiPercentage,
        aiStatus: response.data.aiAnalysis?.success ? 'Analyzed ✓' : 'Pending Analysis'
      });
    } catch (err) {
      console.error("❌ Upload failed:", err);
      if (err.response?.status === 401) {
        alert("Session expired. Please login again.");
      } else {
        alert("❌ Upload failed: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setUploading(false);
    }
  };

  const [deleteModal, setDeleteModal] = React.useState(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [successModal, setSuccessModal] = React.useState(null);
  const [deleteSuccessModal, setDeleteSuccessModal] = React.useState(false);

  const handleDelete = async (photo) => {
    if (readonly) {
      alert("🔒 Cannot delete photos in view-only mode");
      return;
    }
    setDeleteModal(photo);
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    
    setIsDeleting(true);
    try {
      await axios.delete(
        `${API_URL}/photos/${deleteModal.photoId}`, 
        {
          headers: getAuthHeaders(),
          data: {
            updateId: deleteModal.updateId,
            s3Key: deleteModal.s3Key,
            taskId: deleteModal.taskId,
            projectId: projectId
          },
        }
      );

      await fetchConfirmedPhotosForProject();
      setDeleteModal(null);
      setDeleteSuccessModal(true);
    } catch (err) {
      console.error("❌ Error deleting photo:", err);
      alert("❌ Failed to delete photo");
    } finally {
      setIsDeleting(false);
    }
  };

  const openViewModal = (photo) => setViewModal(photo);
  const closeViewModal = () => setViewModal(null);

  // ✅ Group photos by phase/task with sorting
  const getGroupedPhotos = () => {
    // First, group by phase, then by task within each phase
    const grouped = photos.reduce((acc, photo) => {
      const phaseName = photo.phaseName || "Ungrouped";
      const taskName = photo.taskName || "No Task";
      
      if (!acc[phaseName]) {
        acc[phaseName] = {};
      }
      if (!acc[phaseName][taskName]) {
        acc[phaseName][taskName] = [];
      }
      
      acc[phaseName][taskName].push(photo);
      return acc;
    }, {});

    // Sort photos within each task by upload date
    Object.keys(grouped).forEach(phaseName => {
      Object.keys(grouped[phaseName]).forEach(taskName => {
        grouped[phaseName][taskName].sort((a, b) => {
          const dateA = new Date(a.uploadedAt).getTime();
          const dateB = new Date(b.uploadedAt).getTime();
          return photoSortOrder === "newest" ? dateB - dateA : dateA - dateB;
        });
      });
    });

    return grouped;
  };

  // Toggle phase expansion
  const togglePhase = (phaseName) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseName]: !prev[phaseName]
    }));
  };

  if (!projectId) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg">
        <p className="text-gray-500 dark:text-slate-400">No project selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      {showUploadForm && !readonly && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Photo for AI Analysis</h3>
            <button
              onClick={() => setShowUploadForm(false)}
              className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 text-xl"
            >
              ×
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
              <span>ℹ️</span>
              <span>
                <strong>AI-Powered Analysis:</strong> Select a task and upload a photo. 
                Our YOLOv11 model will analyze it and suggest a completion percentage. 
                Go to the <strong>REPORTS tab</strong> to review, edit, and approve.
              </span>
            </p>
          </div>

          <div className="space-y-4">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Select Photo <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
              {selectedFile && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✓ {selectedFile.name} selected
                </p>
              )}
            </div>

            {/* ✅ UPDATED: Task Dropdown WITHOUT completion percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Select Task <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select a Task --</option>
                {tasks.map((task) => (
                  <option key={task.milestoneId} value={task.milestoneId}>
                    {task.milestoneName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                AI will analyze this photo and suggest completion percentage in Reports
              </p>
            </div>

            {/* Caption */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Caption (optional)
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe what's in this photo..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || !selectedTask || uploading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors font-medium"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading & Analyzing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload for AI Analysis
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Approved Photos Grid */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              Approved Photos
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {photos.length} AI-verified and confirmed photos
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Sort Filter Buttons */}
            {photos.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPhotoSortOrder("newest")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    photoSortOrder === "newest"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600"
                  }`}
                >
                  ↓ Newest First
                </button>
                <button
                  onClick={() => setPhotoSortOrder("oldest")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    photoSortOrder === "oldest"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600"
                  }`}
                >
                  ↑ Oldest First
                </button>
              </div>
            )}
            {readonly && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                🔒 View Only
              </div>
            )}
            {!readonly && (
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Photo
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-slate-400">Loading photos...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-slate-400">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="mb-2 font-medium">No approved photos yet</p>
            <p className="text-sm">Upload photos and approve them in the Reports tab</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Grouped Photos by Phase */}
            {Object.keys(getGroupedPhotos()).map((phaseName) => (
              <div key={phaseName} className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                {/* Phase Header */}
                <button
                  onClick={() => togglePhase(phaseName)}
                  className="w-full bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 px-4 py-3 flex items-center justify-between hover:bg-gradient-to-r hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/40 dark:hover:to-blue-700/40 transition-colors"
                >
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>{expandedPhases[phaseName] ? "▼" : "▶"}</span>
                    🏗️ {phaseName}
                    <span className="text-xs bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-200 px-2 py-1 rounded-full">
                      {Object.values(getGroupedPhotos()[phaseName]).reduce((sum, tasks) => sum + tasks.length, 0)} photos
                    </span>
                  </h3>
                </button>

                {/* Phase Tasks - Expanded State */}
                {expandedPhases[phaseName] && (
                  <div className="p-4 space-y-6 bg-gray-50 dark:bg-slate-900/50">
                    {Object.keys(getGroupedPhotos()[phaseName]).map((taskName) => (
                      <div key={`${phaseName}-${taskName}`}>
                        {/* Task Header */}
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-800 dark:text-slate-300 flex items-center gap-2">
                            <span>📋</span>
                            {taskName}
                            <span className="text-xs bg-gray-300 dark:bg-slate-700 text-gray-900 dark:text-slate-300 px-2 py-1 rounded-full">
                              {getGroupedPhotos()[phaseName][taskName].length}
                            </span>
                          </h4>
                        </div>

                        {/* Photos Grid for Task */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {getGroupedPhotos()[phaseName][taskName].map((photo) => (
                            <div
                              key={photo.photoId}
                              className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border-2 border-green-200 dark:border-green-600 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 group"
                            >
                              <div className="relative overflow-hidden">
                                <img
                                  src={photo.fileURL}
                                  alt={photo.caption}
                                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute top-2 left-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg">
                                  <CheckCircle className="w-4 h-4" />
                                  AI Verified
                                </div>
                              </div>

                              <div className="p-4">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2 truncate text-sm">
                                  {photo.caption || "No caption"}
                                </h3>
                                <div className="space-y-1 mb-3">
                                  <p className="text-xs text-gray-600 dark:text-slate-400 truncate">
                                    📄 {photo.updateId}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-slate-400">
                                    📅 {new Date(photo.uploadedAt).toLocaleDateString()}
                                  </p>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => openViewModal(photo)}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View
                                  </button>
                                  <button
                                    onClick={() => handleDelete(photo)}
                                    disabled={readonly}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md ${
                                      readonly
                                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white hover:shadow-lg'
                                    }`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Modal - Enhanced */}
      {viewModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeViewModal}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 sticky top-0 z-10 rounded-t-2xl">
              <div className="flex items-center gap-3 flex-1">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Photo Details
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">{viewModal.caption || "No caption"}</p>
                </div>
              </div>
              <button
                onClick={closeViewModal}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                title="Close"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="relative group mb-6">
                <img
                  src={viewModal.fileURL}
                  alt={viewModal.caption}
                  className="w-full max-h-[60vh] object-contain rounded-xl border-2 border-gray-200 dark:border-slate-700 shadow-lg"
                />
                <div className="absolute top-3 right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
                  <CheckCircle className="w-4 h-4" />
                  AI Verified
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <h4 className="font-bold text-gray-900 dark:text-white">Information</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Update ID</span>
                      <span className="font-mono text-xs text-gray-900 dark:text-white truncate ml-2">{viewModal.updateId}</span>
                    </div>
                    {viewModal.taskName && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">Task</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{viewModal.taskName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Uploaded</span>
                      <span className="text-gray-900 dark:text-white">{new Date(viewModal.uploadedAt).toLocaleDateString()}</span>
                    </div>
                    {viewModal.confirmedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-slate-400">Approved</span>
                        <span className="text-green-600 dark:text-green-400">{new Date(viewModal.confirmedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    <h4 className="font-bold text-gray-900 dark:text-white">Completion</h4>
                  </div>
                  <div className="space-y-3">
                    {viewModal.aiSuggestedPercentage && (
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">🤖 AI Suggested</p>
                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                          {viewModal.aiSuggestedPercentage}%
                        </p>
                      </div>
                    )}
                    {viewModal.userInputPercentage && (
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">✅ Confirmed</p>
                        <p className="text-2xl font-black text-green-600 dark:text-green-400">
                          {viewModal.userInputPercentage}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {viewModal.aiAnalysis && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-5 border-2 border-purple-200 dark:border-purple-700 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    <h4 className="font-bold text-gray-900 dark:text-white">AI Analysis</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Objects</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{viewModal.totalObjects || 0}</p>
                    </div>
                    {viewModal.aiSuggestion && (
                      <>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Milestone</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{viewModal.aiSuggestion.milestone}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Confidence</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{viewModal.aiSuggestion.confidence}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={closeViewModal}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mr-3">
                <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Photo Uploaded Successfully!</h3>
            </div>
            
            <div className="mb-6 space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                <span className="text-gray-600 dark:text-slate-400">Task:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{successModal.task}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                <span className="text-gray-600 dark:text-slate-400">Update ID:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{successModal.updateId}</span>
              </div>
              {successModal.aiPercentage && (
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                  <span className="text-gray-600 dark:text-slate-400">AI Suggested:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{successModal.aiPercentage}%</span>
                </div>
              )}
              <div className="flex justify-between py-2 bg-blue-50 dark:bg-blue-900/20 rounded px-3">
                <span className="text-blue-600 dark:text-blue-400 font-semibold">AI Status:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{successModal.aiStatus}</span>
              </div>
            </div>

            <p className="text-gray-600 dark:text-slate-400 mb-6 text-sm">
              Go to the REPORTS tab to review AI suggestions and confirm progress.
            </p>

            <div className="flex justify-end">
              <button
                onClick={() => setSuccessModal(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Modal */}
      {deleteSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mr-3">
                <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Photo Deleted Successfully!</h3>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setDeleteSuccessModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Confirm Delete</h3>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-600 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Photos;