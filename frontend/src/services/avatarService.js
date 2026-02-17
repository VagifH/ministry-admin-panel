import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export const avatarService = {
  /**
   * Get all avatars
   * @returns {Promise<Array>} List of avatar objects
   */
  async getAvatars() {
    const response = await axios.get(`${API_URL}/avatars`);
    return response.data;
  },

  /**
   * Update avatar settings (display_name, is_active)
   * @param {string} avatarId - The avatar ID
   * @param {Object} updates - { display_name?, is_active? }
   * @returns {Promise<Object>} Updated avatar object
   */
  async updateAvatar(avatarId, updates) {
    const response = await axios.patch(`${API_URL}/avatars/${avatarId}`, updates);
    return response.data;
  },

  /**
   * Upload a photo for an avatar
   * @param {string} avatarId - The avatar ID (avatar-1, avatar-2, avatar-3)
   * @param {File} file - The image file to upload
   * @returns {Promise<Object>} Updated avatar object
   */
  async uploadPhoto(avatarId, file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(
      `${API_URL}/avatars/${avatarId}/photo`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Delete photo from an avatar
   * @param {string} avatarId - The avatar ID
   * @returns {Promise<void>}
   */
  async deletePhoto(avatarId) {
    await axios.delete(`${API_URL}/avatars/${avatarId}/photo`);
  },
};

export default avatarService;
