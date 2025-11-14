import { useState, useEffect } from "react";
import { Upload, Trash2, Eye, CheckCircle, Image as ImageIcon } from "lucide-react";
import axios from "axios";

const API_URL = "http://localhost:5001/api";

const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token");

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${getToken()}`,
  'Content-Type': 'application/json'
});

const Photos = ({ projectId }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [selectedTask, setSelectedTask] = useState(""); // ✅ Just task selection
  const [tasks, setTasks] = useState([]);
  const [viewModal, setViewModal] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

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

      alert(
        `✅ Photo uploaded successfully!\n\n` +
        `Update ID: ${updateId}\n` +
        `Task: ${taskDetails?.milestoneName}\n` +
        `AI Status: ${response.data.aiAnalysis?.success ? 'Analyzed ✓' : 'Failed'}\n\n` +
        `📝 Go to the REPORTS tab to review AI suggestions and approve.`
      );
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

  const handleDelete = async (photo) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;

    try {
      await axios.delete(
        `${API_URL}/photos/${photo.photoId}`, 
        {
          headers: getAuthHeaders(),
          data: {
            updateId: photo.updateId,
            s3Key: photo.s3Key,
          },
        }
      );

      await fetchConfirmedPhotosForProject();
      alert("✅ Photo deleted successfully!");
    } catch (err) {
      console.error("❌ Error deleting photo:", err);
      alert("❌ Failed to delete photo");
    }
  };

  const openViewModal = (photo) => setViewModal(photo);
  const closeViewModal = () => setViewModal(null);

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
      {showUploadForm && (
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
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Photo
          </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.photoId}
                className="bg-slate-700 dark:bg-slate-900 rounded-lg overflow-hidden border-2 border-green-500"
              >
                <div className="relative">
                  <img
                    src={photo.fileURL}
                    alt={photo.caption}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    AI Verified
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-white mb-1 truncate">
                    {photo.caption || "No caption"}
                  </h3>
                  {photo.taskName && (
                    <p className="text-xs text-blue-400 mb-1">
                      📋 {photo.taskName}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mb-1">
                    Update: {photo.updateId}
                  </p>
                  <p className="text-xs text-slate-400 mb-1">
                    Uploaded: {new Date(photo.uploadedAt).toLocaleDateString()}
                  </p>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => openViewModal(photo)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(photo)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={closeViewModal}
        >
          <div
            className="bg-slate-800 rounded-lg max-w-4xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">
                {viewModal.caption || "Photo Details"}
              </h3>
              <button
                onClick={closeViewModal}
                className="text-white hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>

            <img
              src={viewModal.fileURL}
              alt={viewModal.caption}
              className="w-full max-h-[60vh] object-contain rounded-lg mb-4"
            />

            <div className="space-y-2 text-sm text-slate-300">
              <p><strong>Update ID:</strong> {viewModal.updateId}</p>
              {viewModal.taskName && (
                <p><strong>Task:</strong> {viewModal.taskName}</p>
              )}
              <p><strong>Uploaded:</strong> {new Date(viewModal.uploadedAt).toLocaleString()}</p>
              {viewModal.confirmedAt && (
                <p><strong>Approved:</strong> {new Date(viewModal.confirmedAt).toLocaleString()}</p>
              )}
              {viewModal.aiAnalysis && (
                <div className="mt-4 p-4 bg-blue-900/30 rounded-lg">
                  <p className="font-bold text-blue-300 mb-2">AI Analysis:</p>
                  <p><strong>Objects Detected:</strong> {viewModal.totalObjects || 0}</p>
                  {viewModal.aiSuggestion && (
                    <>
                      <p><strong>AI Suggested:</strong> {viewModal.aiSuggestion.milestone}</p>
                      <p><strong>Confidence:</strong> {viewModal.aiSuggestion.confidence}</p>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={closeViewModal}
              className="mt-6 w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Photos;