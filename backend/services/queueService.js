/**
 * queueService.js
 * Manual Max-Heap implementation for patient priority queue.
 * No external libraries used.
 */

class MaxHeap {
  constructor() {
    this.heap = [];
  }

  // Return index of parent
  _parent(i) {
    return Math.floor((i - 1) / 2);
  }

  // Return index of left child
  _left(i) {
    return 2 * i + 1;
  }

  // Return index of right child
  _right(i) {
    return 2 * i + 2;
  }

  // Swap two elements
  _swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  // Bubble up the last element to restore heap property
  _bubbleUp(i) {
    while (i > 0) {
      const p = this._parent(i);
      if (this.heap[p].priorityScore < this.heap[i].priorityScore) {
        this._swap(p, i);
        i = p;
      } else {
        break;
      }
    }
  }

  // Sift down the element at index i
  _siftDown(i) {
    const n = this.heap.length;
    while (true) {
      let largest = i;
      const l = this._left(i);
      const r = this._right(i);

      if (l < n && this.heap[l].priorityScore > this.heap[largest].priorityScore) {
        largest = l;
      }
      if (r < n && this.heap[r].priorityScore > this.heap[largest].priorityScore) {
        largest = r;
      }

      if (largest !== i) {
        this._swap(largest, i);
        i = largest;
      } else {
        break;
      }
    }
  }

  /**
   * Insert a patient into the heap.
   * @param {Object} patient
   */
  insertPatient(patient) {
    this.heap.push(patient);
    this._bubbleUp(this.heap.length - 1);
  }

  /**
   * Update a patient's data by id and re-heapify.
   * @param {string} id
   * @param {Object} updates - partial patient fields
   * @returns {boolean} true if found and updated
   */
  updatePatient(id, updates) {
    const idx = this.heap.findIndex((p) => p.id === id);
    if (idx === -1) return false;

    this.heap[idx] = { ...this.heap[idx], ...updates };
    // Re-heapify from the updated position
    this._bubbleUp(idx);
    this._siftDown(idx);
    return true;
  }

  /**
   * Get (peek) the highest priority patient without removing.
   * @returns {Object|null}
   */
  getHighestPriority() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  /**
   * Remove and return the highest priority patient.
   * @returns {Object|null}
   */
  extractMax() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const max = this.heap[0];
    this.heap[0] = this.heap.pop();
    this._siftDown(0);
    return max;
  }

  /**
   * Remove a patient by id from the heap.
   * @param {string} id
   * @returns {Object|null} removed patient or null
   */
  removeById(id) {
    const idx = this.heap.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const removed = this.heap[idx];
    const last = this.heap.pop();

    if (idx < this.heap.length) {
      this.heap[idx] = last;
      this._bubbleUp(idx);
      this._siftDown(idx);
    }

    return removed;
  }

  /**
   * Rebuild the entire heap from scratch.
   * Used after bulk updates (e.g., MCI toggle, decay engine).
   */
  rebuildHeap() {
    // Floyd's algorithm: start from last non-leaf
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this._siftDown(i);
    }
  }

  /**
   * Return a sorted copy of all patients (highest priority first).
   * Does NOT modify the heap.
   * @returns {Object[]}
   */
  getSortedQueue() {
    // Copy and heapsort
    const copy = [...this.heap];
    return copy.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Get all patients (in heap order).
   * @returns {Object[]}
   */
  getAll() {
    return [...this.heap];
  }

  /**
   * Check if heap is empty.
   */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Size of heap.
   */
  size() {
    return this.heap.length;
  }
}

// Singleton heap instance
const patientHeap = new MaxHeap();

module.exports = { MaxHeap, patientHeap };
