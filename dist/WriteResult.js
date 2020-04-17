"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

/**
 * A document that contains information regarding any error, excluding write concern errors, encountered during the write operation.
 * @typedef {Object} WriteError
 * @property {string} code An integer value identifying the error.
 * @property {number} errmsg A description of the error.
 */

/**
 * A wrapper that contains the result status of write methods.
 * @typedef {Object} WriteResult
 * @property {string} _id The _id of the document inserted by an upsert. Returned only if an upsert results in an insert.
 * @property {number} nInserted The number of documents inserted, excluding upserted documents.
 * @property {number} nMatched The number of documents selected for update. If the update operation results in no change to the document, e.g. `$set` expression updates the value to the current value, `nMatched` can be greater than `nModified`.
 * @property {number} nModified The number of existing documents updated. If the update/replacement operation results in no change to the document, such as setting the value of the field to its current value, `nModified` can be less than `nMatched`.
 * @property {number} nUpserted The number of documents inserted by an upsert.
 * @property {number} nRemoved The number of documents removed.
 * @property {WriteError} writeError A document that contains information regarding any error, excluding write concern errors, encountered during the write operation.
 */

/**
 * A wrapper that contains the result status of write methods.
 * @param {WriteResult} data The write result.
 * @constructor
 */
var WriteResult = function WriteResult(_ref) {
  var _ref$nInserted = _ref.nInserted,
      nInserted = _ref$nInserted === void 0 ? 0 : _ref$nInserted,
      _ref$nMatched = _ref.nMatched,
      nMatched = _ref$nMatched === void 0 ? 0 : _ref$nMatched,
      _ref$nModified = _ref.nModified,
      nModified = _ref$nModified === void 0 ? 0 : _ref$nModified,
      _ref$nUpserted = _ref.nUpserted,
      nUpserted = _ref$nUpserted === void 0 ? 0 : _ref$nUpserted,
      _ref$nRemoved = _ref.nRemoved,
      nRemoved = _ref$nRemoved === void 0 ? 0 : _ref$nRemoved,
      _ref$_id = _ref._id,
      _id = _ref$_id === void 0 ? undefined : _ref$_id,
      _ref$writeError = _ref.writeError,
      writeError = _ref$writeError === void 0 ? undefined : _ref$writeError;

  this._id = _id;
  this.nInserted = nInserted;
  this.nMatched = nMatched;
  this.nModified = nModified;
  this.nUpserted = nUpserted;
  this.nRemoved = nRemoved;
  this.writeError = writeError;
};

var _default = WriteResult;
exports["default"] = _default;