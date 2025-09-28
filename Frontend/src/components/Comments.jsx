import React, { useState } from 'react';

const Comments = () => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');

    const handleAddComment = () => {
        if (newComment.trim()) {
            const comment = {
                id: Date.now(),
                author: 'Current User',
                content: newComment,
                timestamp: new Date().toISOString()
            };
            setComments([comment, ...comments]);
            setNewComment('');
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
                />
                <div className="mt-3 flex justify-end">
                    <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        Post Comment
                    </button>
                </div>
            </div>

            {/* Comments List */}
            {comments.length > 0 ? (
                <div className="space-y-4">
                    {comments.map((comment) => (
                        <div key={comment.id} className="bg-white p-4 rounded-lg border shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="font-medium text-gray-900">{comment.author}</div>
                                <div className="text-xs text-gray-500">
                                    {new Date(comment.timestamp).toLocaleString()}
                                </div>
                            </div>
                            <div className="text-gray-700">{comment.content}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-gray-500">No comments yet</p>
                    <p className="text-gray-400 text-sm">Start the conversation by adding the first comment</p>
                </div>
            )}
        </div>
    );
};

export default Comments;