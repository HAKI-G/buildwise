import React, { useState, useEffect } from 'react';

const Comments = () => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [error, setError] = useState(null);
    
    const API_URL = 'http://localhost:5001/api';
    const UPDATE_ID = 'default-update'; // You can change this or get it from props/URL
    const USER_ID = 'current-user-id'; // Replace with actual user ID from auth

    // Load comments when component mounts
    useEffect(() => {
        loadComments();
    }, []);

    const loadComments = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`${API_URL}/comments/${UPDATE_ID}`);
            
            if (!response.ok) {
                throw new Error('Failed to load comments');
            }
            
            const data = await response.json();
            // Sort by newest first
            const sortedComments = (data || []).sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );
            setComments(sortedComments);
        } catch (error) {
            console.error('Error loading comments:', error);
            setError(error.message);
            setComments([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) {
            alert('Please enter a comment');
            return;
        }

        setIsPosting(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/comments/${UPDATE_ID}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    commentText: newComment,
                    userId: USER_ID
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to post comment');
            }

            const result = await response.json();
            console.log('Comment posted:', result);

            // Reload comments to show the new one
            await loadComments();
            
            setNewComment('');
            alert('Comment posted successfully!');
        } catch (error) {
            console.error('Error posting comment:', error);
            setError(error.message);
            alert(`Failed to post comment: ${error.message}`);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Project Comments</h2>
            </div>

            {/* Add Comment */}
            <div className="bg-white p-4 rounded-lg border shadow-sm">
                <h3 className="font-medium mb-3">Add Comment</h3>
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share an update or leave a note..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows="3"
                    disabled={isPosting}
                />
                <div className="mt-3 flex justify-end">
                    <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || isPosting}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isPosting ? 'Posting...' : 'Post Comment'}
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <p className="font-medium">Error:</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                    <p className="mt-2 text-gray-500">Loading comments...</p>
                </div>
            )}

            {/* Comments List */}
            {!isLoading && comments.length > 0 && (
                <div className="space-y-4">
                    {comments.map((comment) => (
                        <div key={comment.commentId} className="bg-white p-4 rounded-lg border shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="font-medium text-gray-900">
                                    User: {comment.userId}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {new Date(comment.createdAt).toLocaleString()}
                                </div>
                            </div>
                            <div className="text-gray-700">{comment.commentText}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && comments.length === 0 && !error && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-gray-500 font-medium">No comments yet</p>
                    <p className="text-gray-400 text-sm mt-1">Start the conversation by adding the first comment</p>
                </div>
            )}
        </div>
    );
};

export default Comments;