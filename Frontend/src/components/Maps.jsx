import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const getToken = () => localStorage.getItem('token');

function Maps() {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [coordinates, setCoordinates] = useState(null);
    const [geocoding, setGeocoding] = useState(false);

    useEffect(() => {
        fetchProjectLocation();
    }, [projectId]);

    const fetchProjectLocation = async () => {
        try {
            const token = getToken();
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`http://localhost:5001/api/projects/${projectId}`, config);
            setProject(res.data);
            
            // Try to geocode the location
            if (res.data.location) {
                geocodeLocation(res.data.location);
            }
        } catch (error) {
            console.error('Error fetching project:', error);
        } finally {
            setLoading(false);
        }
    };

    const geocodeLocation = async (address) => {
    setGeocoding(true);
    try {
        // Add more context to help OSM find the right location
        const searchQuery = `${address}, Quezon City, Metro Manila, Philippines`;
        
        const response = await axios.get(
            `https://nominatim.openstreetmap.org/search`,
            {
                params: {
                    q: searchQuery,
                    format: 'json',
                    limit: 1,
                    countrycodes: 'ph', // Restrict to Philippines
                    addressdetails: 1
                }
            }
        );
        
        if (response.data && response.data.length > 0) {
            const { lat, lon } = response.data[0];
            setCoordinates([parseFloat(lat), parseFloat(lon)]);
        } else {
            // Default to the general area if exact address not found
            setCoordinates([14.6760, 121.0437]); // Quezon City center
        }
    } catch (error) {
        console.error('Error geocoding location:', error);
        setCoordinates([14.6760, 121.0437]);
    } finally {
        setGeocoding(false);
    }
};
const fallbackToOSM = async (address) => {
    try {
        const response = await axios.get(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Philippines')}`
        );
        
        if (response.data && response.data.length > 0) {
            const { lat, lon } = response.data[0];
            setCoordinates([parseFloat(lat), parseFloat(lon)]);
        } else {
            // Default to Quezon City if nothing found
            setCoordinates([14.6760, 121.0437]);
        }
    } catch (error) {
        console.error('Error with OSM fallback:', error);
        setCoordinates([14.6760, 121.0437]);
    }
};

    const openInGoogleMaps = () => {
        if (project?.location) {
            const query = encodeURIComponent(project.location);
            window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
        }
    };

    const getDirections = () => {
        if (project?.location) {
            const query = encodeURIComponent(project.location);
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
        }
    };

    const openInOpenStreetMap = () => {
        if (coordinates) {
            window.open(`https://www.openstreetmap.org/?mlat=${coordinates[0]}&mlon=${coordinates[1]}&zoom=15`, '_blank');
        }
    };

    if (loading) {
        return <div className="text-center p-8">Loading map...</div>;
    }

    if (!project?.location) {
        return (
            <div className="text-center p-8 bg-white border border-gray-200 rounded-lg">
                <p className="text-gray-500">No location data available for this project.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Project Location Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Project Location</h3>
                <div className="space-y-3">
                    <div>
                        <span className="text-sm font-medium text-gray-500">Address:</span>
                        <p className="text-lg text-gray-800">{project.location}</p>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-500">Project Name:</span>
                        <p className="text-base text-gray-800">{project.name}</p>
                    </div>
                    {coordinates && (
                        <div>
                            <span className="text-sm font-medium text-gray-500">Coordinates:</span>
                            <p className="text-sm text-gray-600">
                                Lat: {coordinates[0].toFixed(6)}, Lon: {coordinates[1].toFixed(6)}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Map Actions */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Map Actions</h3>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={openInGoogleMaps}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        View on Google Maps
                    </button>
                    <button
                        onClick={getDirections}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Get Directions
                    </button>
                    <button
                        onClick={openInOpenStreetMap}
                        className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        View on OpenStreetMap
                    </button>
                </div>
            </div>

            {/* Interactive Map */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Interactive Map</h3>
                {geocoding ? (
                    <div className="w-full h-96 rounded-lg border border-gray-300 flex items-center justify-center bg-gray-50">
                        <p className="text-gray-500">Finding location on map...</p>
                    </div>
                ) : coordinates ? (
                    <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-300">
                        <MapContainer
                            center={coordinates}
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={true}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker position={coordinates}>
                                <Popup>
                                    <div className="p-2">
                                        <strong>{project.name}</strong>
                                        <br />
                                        <span className="text-sm">{project.location}</span>
                                    </div>
                                </Popup>
                            </Marker>
                        </MapContainer>
                    </div>
                ) : (
                    <div className="w-full h-96 rounded-lg border border-gray-300 flex items-center justify-center bg-gray-50">
                        <p className="text-gray-500">Unable to locate address on map</p>
                    </div>
                )}
                <p className="text-xs text-gray-500 mt-3">
                    <strong>Free Mapping:</strong> Powered by OpenStreetMap - No API fees or usage limits. 
                    Click and drag to pan, scroll to zoom.
                </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                    <strong>Navigation Options:</strong> Use "View on Google Maps" for detailed satellite imagery and street view, 
                    or "Get Directions" for turn-by-turn navigation from your current location.
                </p>
            </div>
        </div>
    );
}

export default Maps;