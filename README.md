# 🎧 Bucket Sort Visualizer

An immersive, interactive, and visually appealing web-based visualizer for the **Bucket Sort** algorithm. It features real-time step-by-step animations and dynamic audio feedback (beeps) to make learning sorting algorithms engaging and fun.

🔗 **Live Demo:** [Play with the Visualizer Here!](https://pankajtiwari-art.github.io/bucket-sort-visualizer/)

---

## ✨ Features

* **🔊 Audio Feedback:** Gentle, frequency-mapped beeps for every distribution, compare, swap, and gather action using the Web Audio API.
* **📊 Detailed Visuals:** Watch the entire pipeline of Bucket Sort:
  1. **Distribution:** Elements are dynamically moved into 10 buckets based on their tens digit.
  2. **Internal Sorting:** Each bucket is sorted individually using **Insertion Sort**, complete with visual highlights.
  3. **Gathering:** Sorted elements are collected back into the main array smoothly.
* **🎛️ Interactive Controls:**
  * Adjust **Array Size** (5 to 24 elements).
  * Control **Animation Speed** (20ms to 400ms).
  * Generate a **Random Array** anytime.
  * **Start** and **Stop** the sorting process midway.
* **📱 Responsive UI:** Built with a modern glassmorphism design that looks great on different screen sizes.

---

## 🛠️ Tech Stack

* **HTML5:** Semantic structure and Canvas for array rendering.
* **CSS3:** Flexbox, Grid, CSS Variables, and Glassmorphism effects for a stunning UI.
* **Vanilla JavaScript (ES6+):** Async/Await for smooth animations, DOM manipulation, and Web Audio API for sound generation. No external libraries used!

---

## 🚀 How to Run Locally

1. Clone this repository:
   ```bash
   git clone [https://github.com/pankajtiwari-art/bucket-sort-visualizer.git](https://github.com/pankajtiwari-art/bucket-sort-visualizer.git)
2. Navigate to the project folder:
   ```bash
   cd bucket-sort-visualizer
3. Open the index.html file directly in your web browser. No local server required!
---

## How Bucket Sort Works 
1. The app generates an array of random numbers ranging from 0 to 99.
​2. It creates 10 buckets (representing ranges 0-9, 10-19, ..., 90-99).
3. ​It iterates through the array and places each number into its corresponding bucket by looking at its "tens" digit.
4. ​Once distributed, it goes through each bucket and sorts its contents using the Insertion Sort algorithm.
5. ​Finally, it gathers the sorted numbers from Bucket 0 to Bucket 9 and overwrites the main array, resulting in a fully sorted list!

---
## Pankaj Tiwari - Developer & Creator
Feel free to star ⭐ this repository if you found it helpful or interesting!
