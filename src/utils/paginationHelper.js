// utils/paginationHelper.js
/**
 * Generate pagination data for database queries
 * @param {Object} req - Express request object
 * @param {Number} defaultLimit - Default items per page
 * @returns {Object} Pagination options with skip and limit
 */
const getPaginationOptions = (req, defaultLimit = 10) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || defaultLimit;
    const skip = (page - 1) * limit;
    
    return {
      page,
      limit,
      skip
    };
  };
  
  /**
   * Generate pagination metadata for response
   * @param {Number} totalItems - Total count of items
   * @param {Number} page - Current page number
   * @param {Number} limit - Items per page
   * @returns {Object} Pagination metadata
   */
  const getPaginationMetadata = (totalItems, page, limit) => {
    const totalPages = Math.ceil(totalItems / limit);
    
    return {
      totalItems,
      itemsPerPage: limit,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    };
  };
  
  /**
   * Generate search filter for MongoDB
   * @param {String} searchQuery - Search term
   * @param {Array} fields - Fields to search in
   * @returns {Object} MongoDB filter object
   */
  const getSearchFilter = (searchQuery, fields) => {
    if (!searchQuery || searchQuery.trim() === '') {
      return {};
    }
    
    const regex = { $regex: searchQuery, $options: 'i' };
    
    return {
      $or: fields.map(field => ({ [field]: regex }))
    };
  };
  
  module.exports = {
    getPaginationOptions,
    getPaginationMetadata,
    getSearchFilter
  };