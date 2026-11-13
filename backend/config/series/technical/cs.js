/** Technical series — CS / IT / AI / Data Science. Entries: [question, answer, [wrong x3], why, topic]. */
const { makeTechnicalBuilder, numQ, int, pick } = require("./common");

const TEMPLATES = {
  beginner: {
    decToBin: (r) => {
      const n = int(r, 9, 60);
      const a = n.toString(2);
      return { topic: "Number systems", prompt: `What is the binary representation of ${n}?`, answer: a, wrong: [(n + 1).toString(2), (n - 1).toString(2), (n ^ 2).toString(2)].filter((x) => x !== a), explanation: `${n} = ${a}₂ (repeated division by 2).` };
    },
    binToDec: (r) => {
      const n = int(r, 9, 120);
      return numQ("Number systems", `What is the decimal value of binary ${n.toString(2)}?`, n, 2, String, `Sum of the place values of the 1-bits = ${n}.`);
    },
    bitsNeeded: (r) => {
      const n = pick(r, [20, 50, 100, 200, 500, 1000, 3000]);
      return numQ("Number systems", `What is the minimum number of bits needed to represent ${n} distinct values?`, Math.ceil(Math.log2(n)), 1, String, `2^${Math.ceil(Math.log2(n))} = ${2 ** Math.ceil(Math.log2(n))} ≥ ${n}, while 2^${Math.ceil(Math.log2(n)) - 1} is not enough.`);
    },
    arrayAddress: (r) => {
      const base = int(r, 10, 99) * 100, size = pick(r, [2, 4, 8]), i = int(r, 3, 20);
      return numQ("Arrays", `An array starts at address ${base} and each element is ${size} bytes. What is the address of element index ${i}?`, base + i * size, size, String, `Address = base + index × size = ${base} + ${i} × ${size} = ${base + i * size}.`);
    },
    hexToDec: (r) => {
      const n = int(r, 30, 255);
      return numQ("Number systems", `What is the decimal value of hexadecimal ${n.toString(16).toUpperCase()}?`, n, 16, String, `${n.toString(16).toUpperCase()}₁₆ = ${n} in decimal.`);
    },
  },
  intermediate: {
    treeNodes: (r) => {
      const h = int(r, 3, 7);
      return numQ("Trees", `What is the maximum number of nodes in a binary tree of height ${h} (a single root has height 0)?`, 2 ** (h + 1) - 1, 2 ** h, String, `A full binary tree of height h has 2^(h+1) − 1 = ${2 ** (h + 1) - 1} nodes.`);
    },
    subnetHosts: (r) => {
      const prefix = pick(r, [24, 25, 26, 27, 28, 29]);
      const hosts = 2 ** (32 - prefix) - 2;
      return numQ("Computer networks", `How many usable host addresses does a /${prefix} IPv4 subnet have?`, hosts, Math.max(2, hosts / 2), String, `2^(32−${prefix}) − 2 (network and broadcast addresses) = ${hosts}.`);
    },
    pages: (r) => {
      const memKB = pick(r, [64, 128, 256, 512]), pageKB = pick(r, [1, 2, 4, 8]);
      return numQ("Operating systems", `A process uses ${memKB} KB of memory and the page size is ${pageKB} KB. How many pages does it need?`, memKB / pageKB, Math.max(2, memKB / pageKB / 4), String, `${memKB} ÷ ${pageKB} = ${memKB / pageKB} pages.`);
    },
    hashSlot: (r) => {
      const m = pick(r, [7, 11, 13, 17]), k = int(r, 20, 200);
      return numQ("Hashing", `Using h(k) = k mod ${m}, which slot does key ${k} map to?`, k % m, 1, String, `${k} mod ${m} = ${k % m}.`);
    },
    sumComparisons: (r) => {
      const n = int(r, 5, 15);
      return numQ("Sorting", `How many comparisons does bubble sort make on ${n} elements in the worst case (without early exit)?`, (n * (n - 1)) / 2, n, String, `(n−1) + (n−2) + … + 1 = n(n−1)/2 = ${(n * (n - 1)) / 2}.`);
    },
  },
  advanced: {
    amdahl: (r) => {
      const p = pick(r, [50, 60, 75, 80, 90]), n = pick(r, [2, 4, 8]);
      const s = Math.round((1 / (1 - p / 100 + p / 100 / n)) * 100) / 100;
      return numQ("Computer architecture", `By Amdahl's law, what is the speed-up if ${p}% of a program is parallelised across ${n} processors?`, s, 0.3, (x) => `${Math.round(x * 100) / 100}×`, `Speed-up = 1 / ((1 − ${p / 100}) + ${p / 100}/${n}) ≈ ${s}×.`);
    },
    cacheHit: (r) => {
      const hit = pick(r, [80, 90, 95]), tc = pick(r, [1, 2, 5]), tm = pick(r, [50, 100, 200]);
      const eff = Math.round((hit / 100 * tc + (1 - hit / 100) * (tc + tm)) * 100) / 100;
      return numQ("Computer architecture", `Cache hit ratio ${hit}%, cache access ${tc} ns, memory access ${tm} ns (on a miss both are paid). What is the effective access time?`, eff, Math.max(1, Math.round(eff / 4)), (x) => `${x} ns`, `EAT = ${hit / 100} × ${tc} + ${1 - hit / 100} × (${tc} + ${tm}) = ${eff} ns.`);
    },
    throughput: (r) => {
      const mb = pick(r, [10, 20, 50, 100]), mbps = pick(r, [10, 20, 40, 80]);
      return numQ("Computer networks", `How many seconds does it take to transmit a ${mb} MB file over a ${mbps} Mbps link (1 byte = 8 bits, ignore overhead)?`, (mb * 8) / mbps, Math.max(1, (mb * 8) / mbps / 4), (x) => `${x} s`, `${mb} MB × 8 = ${mb * 8} Mb; ÷ ${mbps} Mbps = ${(mb * 8) / mbps} s.`);
    },
    masterHeight: (r) => {
      const n = pick(r, [8, 16, 32, 64, 128, 256, 512, 1024]);
      return numQ("Algorithms", `How many levels of recursion does merge sort have on ${n} elements (n = 2^k)?`, Math.log2(n), 1, String, `The array is halved log₂ ${n} = ${Math.log2(n)} times.`);
    },
    deadlockRes: (r) => {
      const p = int(r, 3, 6), need = int(r, 2, 4);
      return numQ("Operating systems", `${p} processes each need ${need} units of a resource to finish. What is the minimum number of units that guarantees no deadlock?`, p * (need - 1) + 1, 1, String, `If each holds ${need - 1} units, one more unit lets one finish: ${p} × ${need - 1} + 1 = ${p * (need - 1) + 1}.`);
    },
  },
};

const BANK = {
  beginner: [
    ["Which data structure follows Last In, First Out (LIFO)?", "Stack", ["Queue", "Linked list", "Heap"], "A stack removes the most recently added item first.", "Data structures"],
    ["Which data structure follows First In, First Out (FIFO)?", "Queue", ["Stack", "Tree", "Graph"], "A queue removes the oldest item first.", "Data structures"],
    ["What is the time complexity of accessing an array element by index?", "O(1)", ["O(n)", "O(log n)", "O(n²)"], "Arrays compute the address directly from the index.", "Data structures"],
    ["Which OOP principle hides internal details and exposes only necessary parts?", "Encapsulation", ["Inheritance", "Polymorphism", "Compilation"], "Encapsulation bundles data with methods and restricts direct access.", "OOP"],
    ["Which SQL command retrieves data from a table?", "SELECT", ["INSERT", "UPDATE", "DELETE"], "SELECT queries rows from tables.", "DBMS"],
    ["What does HTML stand for?", "HyperText Markup Language", ["High Text Machine Language", "Hyperlink Transfer Markup Language", "Home Tool Markup Language"], "HTML structures web pages.", "Web"],
    ["Which keyword creates a subclass in Java?", "extends", ["implements", "inherits", "super"], "class B extends A makes B a subclass of A.", "OOP"],
    ["What is the main function of an operating system?", "Managing hardware resources and providing services to programs", ["Compiling programs", "Designing web pages", "Storing passwords only"], "The OS manages CPU, memory, devices and files.", "Operating systems"],
    ["Which layer of the OSI model handles routing between networks?", "Network layer", ["Transport layer", "Data link layer", "Session layer"], "The network layer (layer 3) handles IP routing.", "Computer networks"],
    ["What is a primary key?", "A column that uniquely identifies each row and cannot be NULL", ["Any column with numbers", "A column that links to another table", "The first column of every table"], "Primary keys uniquely identify rows.", "DBMS"],
    ["Which protocol is used to load web pages securely?", "HTTPS", ["FTP", "SMTP", "HTTP"], "HTTPS is HTTP over TLS encryption.", "Computer networks"],
    ["What is a compiler?", "A program that translates source code into machine code before execution", ["A program that runs code line by line", "A text editor", "A database"], "Compilers translate the whole program ahead of time.", "Programming basics"],
    ["Which of these is NOT a programming language?", "HTTP", ["Python", "Java", "C++"], "HTTP is a protocol, not a language.", "Programming basics"],
    ["What does CSS control in a web page?", "Presentation and layout", ["Database queries", "Server logic", "Network routing"], "CSS styles HTML content.", "Web"],
    ["What is polymorphism?", "The ability of one interface to have many implementations", ["Hiding data", "Creating many objects", "Copying classes"], "e.g. method overriding or overloading.", "OOP"],
    ["Which SQL clause filters rows?", "WHERE", ["ORDER BY", "GROUP BY", "FROM"], "WHERE applies conditions to rows.", "DBMS"],
    ["What is RAM?", "Volatile main memory used by running programs", ["Permanent storage", "A type of CPU", "Network memory"], "RAM loses its contents when power is off.", "Computer fundamentals"],
    ["Which data structure is best for implementing recursion internally?", "Stack", ["Queue", "Hash table", "Graph"], "Function calls are pushed on the call stack.", "Data structures"],
    ["What is an IP address?", "A numerical label identifying a device on a network", ["A website name", "A type of cable", "An email address"], "IP addresses route packets to devices.", "Computer networks"],
    ["Which of these is a NoSQL database?", "MongoDB", ["MySQL", "PostgreSQL", "Oracle"], "MongoDB stores JSON-like documents.", "DBMS"],
    ["What is the output of 7 % 3 in most programming languages?", "1", ["2", "0", "2.33"], "% returns the remainder: 7 = 2×3 + 1.", "Programming basics"],
    ["What does a constructor do in a class?", "Initialises a new object", ["Destroys an object", "Copies a class", "Compiles the class"], "Constructors run when an object is created.", "OOP"],
    ["Which sorting algorithm repeatedly swaps adjacent elements that are out of order?", "Bubble sort", ["Merge sort", "Quick sort", "Heap sort"], "Bubble sort bubbles large items to the end.", "Algorithms"],
    ["What is the binary search precondition?", "The data must be sorted", ["The data must be in a linked list", "The data must have no duplicates", "The data must be small"], "Binary search halves a sorted range.", "Algorithms"],
    ["Which device forwards packets between different networks?", "Router", ["Switch", "Hub", "Repeater"], "Routers work at the network layer.", "Computer networks"],
    ["What is a foreign key?", "A column that references the primary key of another table", ["A key used for encryption", "A unique key in the same table", "A key from another database server"], "Foreign keys enforce relationships.", "DBMS"],
    ["Which of these is an interpreted language commonly?", "Python", ["C", "C++", "Rust"], "Python is executed by an interpreter.", "Programming basics"],
    ["What is the time complexity of linear search?", "O(n)", ["O(1)", "O(log n)", "O(n log n)"], "It may check every element.", "Algorithms"],
    ["What does DNS do?", "Translates domain names into IP addresses", ["Encrypts websites", "Stores emails", "Assigns MAC addresses"], "DNS is the internet's phonebook.", "Computer networks"],
    ["What is inheritance in OOP?", "A class acquiring properties and methods of another class", ["Hiding data", "Overloading operators", "Creating interfaces only"], "Inheritance enables code reuse.", "OOP"],
    ["Which of these is a version control system?", "Git", ["Docker", "Linux", "MySQL"], "Git tracks changes to code.", "Tools"],
    ["What is a linked list node made of?", "Data and a reference to the next node", ["Only data", "An index and a value", "A key and a hash"], "Nodes link together via pointers.", "Data structures"],
    ["Which SQL keyword removes duplicate rows from a result?", "DISTINCT", ["UNIQUE", "DELETE", "DROP"], "SELECT DISTINCT returns unique rows.", "DBMS"],
    ["What is the full form of CPU?", "Central Processing Unit", ["Central Program Utility", "Computer Personal Unit", "Core Processing Utility"], "The CPU executes instructions.", "Computer fundamentals"],
    ["Which HTTP method is typically used to submit form data that creates a resource?", "POST", ["GET", "HEAD", "OPTIONS"], "POST sends data to create resources.", "Web"],
    ["What does an abstract class allow?", "Declaring methods without implementation for subclasses to implement", ["Creating objects directly always", "Only static methods", "Multiple inheritance of state in Java"], "Abstract classes cannot be instantiated directly.", "OOP"],
    ["What is a deadlock?", "Processes waiting forever for resources held by each other", ["A crashed program", "A slow network", "A full disk"], "Deadlock needs circular waiting.", "Operating systems"],
    ["Which data structure uses key-value pairs with average O(1) lookup?", "Hash table", ["Array", "Stack", "Binary tree"], "Hashing maps keys to slots.", "Data structures"],
    ["What is the purpose of the 'git commit' command?", "To record staged changes in the repository history", ["To upload code to GitHub", "To download a repository", "To delete a branch"], "Commits are snapshots of changes.", "Tools"],
    ["Which port does HTTP use by default?", "80", ["443", "21", "25"], "HTTPS uses 443; HTTP uses 80.", "Computer networks"],
    ["What does API stand for?", "Application Programming Interface", ["Advanced Program Integration", "Application Process Instruction", "Automated Programming Input"], "APIs let software components communicate.", "Web"],
    ["What is the base case in recursion?", "The condition that stops further recursive calls", ["The first call", "The largest input", "The return type"], "Without a base case recursion never ends.", "Programming basics"],
    ["Which of these is a relational database?", "MySQL", ["MongoDB", "Redis", "Cassandra"], "MySQL stores data in tables with relations.", "DBMS"],
    ["What does a switch do in a LAN?", "Forwards frames to the correct device using MAC addresses", ["Routes packets between networks", "Assigns IP addresses", "Encrypts traffic"], "Switches work at the data link layer.", "Computer networks"],
    ["What is method overloading?", "Multiple methods with the same name but different parameters", ["A subclass redefining a method", "Calling a method too often", "A method with no body"], "Overloading is compile-time polymorphism.", "OOP"],
    ["What is cloud computing?", "Delivering computing services over the internet on demand", ["Storing data on a USB drive", "A weather forecasting system", "A type of CPU"], "Clouds provide servers, storage and services remotely.", "Computer fundamentals"],
    ["Which structure is used for breadth-first search?", "Queue", ["Stack", "Heap", "Hash table"], "BFS explores level by level using a queue.", "Algorithms"],
    ["What is normalization in DBMS?", "Organising tables to reduce redundancy", ["Encrypting data", "Backing up data", "Indexing every column"], "Normal forms remove anomalies.", "DBMS"],
    ["What does JSON stand for?", "JavaScript Object Notation", ["Java Standard Object Network", "JavaScript Online Node", "Joint Syntax Object Notation"], "JSON is a lightweight data format.", "Web"],
    ["What is the role of an index in a database?", "Speeding up data retrieval", ["Encrypting rows", "Enforcing passwords", "Deleting duplicates"], "Indexes avoid full table scans.", "DBMS"],
    ["What is an algorithm?", "A finite sequence of steps to solve a problem", ["A programming language", "A hardware component", "A type of database"], "Algorithms are language-independent procedures.", "Algorithms"],
    ["Which memory is fastest?", "CPU registers", ["RAM", "SSD", "Hard disk"], "Registers sit inside the CPU.", "Computer fundamentals"],
    ["What does the 'static' keyword mean for a class member in Java?", "It belongs to the class rather than to instances", ["It cannot be changed", "It is private", "It is deleted after use"], "Static members are shared by all objects.", "OOP"],
    ["Which of these is a front-end JavaScript library?", "React", ["Django", "Spring", "Flask"], "React builds user interfaces.", "Web"],
    ["What is the purpose of TCP?", "Reliable, ordered delivery of data between applications", ["Routing between networks", "Translating domain names", "Assigning IP addresses"], "TCP provides connection-oriented reliability.", "Computer networks"],
    ["What is the time complexity of binary search?", "O(log n)", ["O(n)", "O(1)", "O(n²)"], "The search range halves each step.", "Algorithms"],
    ["What is a process in an operating system?", "A program in execution", ["A file on disk", "A CPU core", "A network packet"], "Processes have their own memory and state.", "Operating systems"],
    ["What does SQL's ORDER BY do?", "Sorts the result rows", ["Filters rows", "Groups rows", "Joins tables"], "ORDER BY sorts ascending or descending.", "DBMS"],
    ["Which of these is an example of an operating system?", "Linux", ["Oracle", "Python", "Chrome"], "Linux is an OS kernel family.", "Operating systems"],
    ["What is an object in OOP?", "An instance of a class", ["A blueprint", "A function", "A variable type only"], "Classes define objects; objects are instances.", "OOP"],
  ],
  intermediate: [
    ["What is the worst-case time complexity of quicksort?", "O(n²)", ["O(n log n)", "O(n)", "O(log n)"], "Bad pivots split the array unevenly every time.", "Algorithms"],
    ["Which normal form removes transitive dependencies?", "3NF", ["1NF", "2NF", "BCNF only"], "3NF: non-key attributes depend only on the key.", "DBMS"],
    ["Which scheduling algorithm can cause starvation of long processes?", "Shortest Job First", ["Round Robin", "First Come First Served", "FIFO"], "Long jobs may wait forever if short jobs keep arriving.", "Operating systems"],
    ["What does ACID stand for in databases?", "Atomicity, Consistency, Isolation, Durability", ["Accuracy, Consistency, Integrity, Durability", "Atomicity, Concurrency, Integrity, Data", "Access, Control, Isolation, Data"], "ACID guarantees reliable transactions.", "DBMS"],
    ["Which traversal of a binary search tree gives sorted order?", "In-order", ["Pre-order", "Post-order", "Level-order"], "Left, root, right visits keys in ascending order.", "Data structures"],
    ["What is the difference between TCP and UDP?", "TCP is connection-oriented and reliable; UDP is connectionless and faster", ["UDP is reliable; TCP is not", "They are identical", "TCP is only for email"], "UDP suits streaming and gaming.", "Computer networks"],
    ["What is a virtual function used for in C++?", "Runtime polymorphism via dynamic dispatch", ["Faster compilation", "Memory allocation", "Multithreading"], "Calls resolve to the derived class at runtime.", "OOP"],
    ["Which SQL join returns all rows from the left table and matching rows from the right?", "LEFT JOIN", ["INNER JOIN", "RIGHT JOIN", "CROSS JOIN"], "Unmatched right-side values are NULL.", "DBMS"],
    ["What is thrashing in an OS?", "Excessive paging that leaves little time for real work", ["CPU overheating", "Disk fragmentation", "A network flood"], "Too little memory causes constant page faults.", "Operating systems"],
    ["What is the space complexity of merge sort (array version)?", "O(n)", ["O(1)", "O(log n)", "O(n²)"], "It needs an auxiliary array for merging.", "Algorithms"],
    ["Which data structure is used to implement a priority queue efficiently?", "Heap", ["Stack", "Linked list", "Queue"], "Heaps give O(log n) insert and extract.", "Data structures"],
    ["What does the three-way handshake establish?", "A TCP connection (SYN, SYN-ACK, ACK)", ["An encrypted session", "A DNS lookup", "A UDP stream"], "It synchronises sequence numbers.", "Computer networks"],
    ["What is a semaphore?", "A synchronisation variable used to control access to shared resources", ["A type of process", "A memory page", "A network signal"], "Semaphores coordinate concurrent processes.", "Operating systems"],
    ["Which design pattern ensures a class has only one instance?", "Singleton", ["Factory", "Observer", "Adapter"], "Singleton provides a single global instance.", "Software engineering"],
    ["What is the purpose of the GROUP BY clause?", "To aggregate rows that share values", ["To sort rows", "To join tables", "To filter columns"], "Used with COUNT, SUM, AVG, etc.", "DBMS"],
    ["What is a race condition?", "Behaviour that depends on the timing of concurrent operations", ["A fast algorithm", "A network delay", "A type of loop"], "Unsynchronised access to shared data causes it.", "Operating systems"],
    ["What does REST stand for?", "Representational State Transfer", ["Remote Execution Service Transfer", "Real-time Event Stream Transport", "Resource Encryption Standard"], "REST is an architectural style for APIs.", "Web"],
    ["What is the height of a balanced binary search tree with n nodes?", "O(log n)", ["O(n)", "O(1)", "O(n log n)"], "Balancing keeps both subtrees similar in size.", "Data structures"],
    ["Which algorithm finds shortest paths from one source in a graph with non-negative weights?", "Dijkstra's algorithm", ["Kruskal's algorithm", "Prim's algorithm", "Depth-first search"], "Dijkstra greedily expands the closest node.", "Algorithms"],
    ["What is virtual memory?", "Using disk space to extend apparent main memory", ["Memory inside the CPU", "Cloud storage", "A RAM upgrade"], "Paging moves data between RAM and disk.", "Operating systems"],
    ["What is the difference between an interface and an abstract class in Java (pre-Java 8 view)?", "Interfaces declare only abstract methods; abstract classes can have state and implemented methods", ["They are identical", "Abstract classes cannot have constructors", "Interfaces can have instance fields"], "A class can implement many interfaces.", "OOP"],
    ["Which HTTP status code means 'Not Found'?", "404", ["200", "500", "301"], "404 indicates the resource doesn't exist.", "Web"],
    ["What is a minimum spanning tree?", "A subset of edges connecting all vertices with minimum total weight and no cycles", ["The shortest path between two nodes", "A tree with the fewest nodes", "A binary search tree"], "Kruskal and Prim find MSTs.", "Algorithms"],
    ["What is the purpose of an index on a frequently searched column?", "Faster lookups at the cost of extra storage and slower writes", ["Faster writes only", "Data encryption", "Removing duplicates"], "Indexes trade write speed for read speed.", "DBMS"],
    ["What is the role of the transport layer?", "End-to-end communication between processes, using ports", ["Physical transmission of bits", "Routing between networks", "Formatting data for display"], "TCP and UDP are transport protocols.", "Computer networks"],
    ["What is dynamic programming?", "Solving problems by storing results of overlapping subproblems", ["Programming at runtime", "Writing code dynamically", "Random algorithms"], "Memoization or tabulation avoids recomputation.", "Algorithms"],
    ["What is a mutex?", "A lock that allows only one thread into a critical section", ["A type of process", "A memory leak", "A scheduling algorithm"], "Mutual exclusion prevents race conditions.", "Operating systems"],
    ["What is the purpose of a 'finally' block?", "Code that runs whether or not an exception occurs", ["Code that runs only on errors", "The last method in a class", "A loop terminator"], "Used for cleanup like closing files.", "Programming basics"],
    ["What is denormalization?", "Intentionally adding redundancy to improve read performance", ["Removing all redundancy", "Deleting tables", "Encrypting data"], "Common in read-heavy systems.", "DBMS"],
    ["Which protocol automatically assigns IP addresses to devices?", "DHCP", ["DNS", "FTP", "ARP"], "DHCP leases addresses to clients.", "Computer networks"],
    ["Which traversal uses a stack (explicitly or via recursion)?", "Depth-first search", ["Breadth-first search", "Level-order traversal", "Dijkstra's algorithm"], "DFS goes deep before backtracking.", "Algorithms"],
    ["What is the purpose of the 'volatile' keyword in Java?", "Ensuring a variable's latest value is visible to all threads", ["Making a variable constant", "Speeding up loops", "Deleting a variable"], "It prevents threads from caching stale values.", "Programming basics"],
    ["What is a hash collision?", "Two different keys mapping to the same slot", ["A failed hash function", "Duplicate keys", "A full table"], "Handled by chaining or open addressing.", "Data structures"],
    ["What is the role of ARP?", "Mapping IP addresses to MAC addresses on a local network", ["Mapping names to IPs", "Encrypting packets", "Routing between ISPs"], "ARP resolves link-layer addresses.", "Computer networks"],
    ["What is the main advantage of a doubly linked list over a singly linked list?", "Traversal in both directions and easier deletion", ["Less memory", "Faster indexing", "Automatic sorting"], "Each node has prev and next pointers.", "Data structures"],
    ["What does 'git rebase' do?", "Moves or replays commits onto a new base commit", ["Deletes the repository", "Creates a new branch", "Downloads remote changes only"], "Rebase creates a linear history.", "Tools"],
    ["What is CORS?", "A browser mechanism controlling which origins can access a resource", ["A database engine", "A CSS framework", "A compression format"], "Servers send headers allowing cross-origin requests.", "Web"],
    ["What is a B-tree commonly used for?", "Database and file system indexes", ["Sorting in memory", "Network routing", "Image compression"], "B-trees minimise disk reads.", "Data structures"],
    ["Which page replacement algorithm replaces the page used least recently?", "LRU", ["FIFO", "Optimal", "Random"], "LRU approximates future use from past use.", "Operating systems"],
    ["What is the SOLID principle 'S'?", "Single Responsibility Principle", ["Simple Rendering Principle", "Static Resource Principle", "Secure Response Principle"], "A class should have one reason to change.", "Software engineering"],
    ["What is the time complexity to insert into a binary heap?", "O(log n)", ["O(1)", "O(n)", "O(n log n)"], "The new element bubbles up the tree height.", "Data structures"],
    ["Which SQL statement modifies existing rows?", "UPDATE", ["ALTER", "INSERT", "MODIFY"], "ALTER changes table structure, not rows.", "DBMS"],
    ["What is a context switch?", "Saving one process's state and loading another's", ["Changing the user", "Restarting the OS", "Switching networks"], "Context switches have overhead.", "Operating systems"],
    ["What is the purpose of unit testing?", "Testing individual components in isolation", ["Testing the whole system only", "Testing performance only", "Testing user interfaces only"], "Unit tests catch bugs early.", "Software engineering"],
    ["Which protocol sends email between servers?", "SMTP", ["IMAP", "POP3", "HTTP"], "IMAP and POP3 retrieve email.", "Computer networks"],
    ["What does a greedy algorithm do?", "Makes the locally optimal choice at each step", ["Tries all possibilities", "Uses random choices", "Always finds the global optimum"], "Greedy works only for some problems.", "Algorithms"],
    ["What is a view in SQL?", "A virtual table defined by a query", ["A physical copy of a table", "An index", "A user account"], "Views simplify and secure queries.", "DBMS"],
    ["What is the difference between a process and a thread?", "Threads share the process's memory; processes have separate memory", ["Threads are slower", "Processes share memory", "They are identical"], "Threads are lighter-weight.", "Operating systems"],
    ["What is an API rate limit?", "A cap on how many requests a client can make in a time window", ["The speed of the network", "The size of a response", "A database constraint"], "Rate limits protect services from overload.", "Web"],
    ["What is the purpose of a load balancer?", "Distributing traffic across multiple servers", ["Encrypting data", "Storing backups", "Compiling code"], "It improves availability and scalability.", "System design"],
    ["What does 'Big-O' notation describe?", "An upper bound on an algorithm's growth rate", ["Exact runtime in seconds", "Memory size in bytes", "Lines of code"], "It describes scalability, not exact time.", "Algorithms"],
    ["What is a trigger in SQL?", "Code that runs automatically on table events like INSERT", ["A scheduled backup", "A type of index", "A login event"], "Triggers enforce rules automatically.", "DBMS"],
    ["What is the purpose of DNS caching?", "Reducing lookup time by storing recent results", ["Encrypting DNS", "Blocking websites", "Assigning domains"], "Caching avoids repeated queries.", "Computer networks"],
    ["What is an adjacency list?", "A graph representation storing each vertex's neighbours", ["A sorted array", "A matrix of weights", "A list of edges only"], "Efficient for sparse graphs.", "Data structures"],
    ["What is the observer design pattern?", "Objects subscribe to be notified of another object's state changes", ["Creating objects via a factory", "Ensuring one instance", "Converting interfaces"], "Used in event systems.", "Software engineering"],
    ["What is the purpose of 'npm' in JavaScript projects?", "Managing packages and dependencies", ["Compiling JavaScript", "Hosting websites", "Testing databases"], "npm installs libraries.", "Tools"],
    ["Which algorithm uses 'divide and conquer'?", "Merge sort", ["Bubble sort", "Insertion sort", "Linear search"], "It splits, sorts and merges halves.", "Algorithms"],
    ["What is a transaction rollback?", "Undoing all changes of a failed transaction", ["Saving changes", "Deleting a table", "Restarting the server"], "Rollback preserves atomicity.", "DBMS"],
    ["What is a subnet mask used for?", "Separating the network and host portions of an IP address", ["Encrypting traffic", "Naming hosts", "Blocking ports"], "e.g. 255.255.255.0 for /24.", "Computer networks"],
    ["What is the purpose of garbage collection?", "Automatically freeing memory no longer referenced", ["Deleting files", "Compressing code", "Clearing the cache"], "Used in Java, Python, JavaScript.", "Programming basics"],
  ],
  advanced: [
    ["What does the CAP theorem state?", "A distributed system can guarantee at most two of Consistency, Availability and Partition tolerance", ["Systems must be consistent and available", "Caching always improves performance", "Partitions never happen"], "During partitions you choose C or A.", "System design"],
    ["What is the purpose of database sharding?", "Splitting data across machines to scale horizontally", ["Encrypting data", "Removing duplicates", "Creating backups"], "Each shard holds a subset of data.", "System design"],
    ["What is the amortised time complexity of appending to a dynamic array?", "O(1)", ["O(n)", "O(log n)", "O(n²)"], "Occasional resizing averages out.", "Algorithms"],
    ["Which isolation level prevents dirty reads but allows non-repeatable reads?", "Read Committed", ["Read Uncommitted", "Serializable", "Repeatable Read"], "Only committed data is read.", "DBMS"],
    ["What is a Bloom filter?", "A probabilistic structure that tests set membership with possible false positives", ["A sorting algorithm", "A type of index with no errors", "An image filter"], "It never gives false negatives.", "Data structures"],
    ["What problem does consistent hashing solve?", "Minimising key remapping when servers are added or removed", ["Hash collisions", "Password storage", "Sorting large data"], "Only nearby keys move.", "System design"],
    ["What is the time complexity of building a heap from n elements (heapify)?", "O(n)", ["O(n log n)", "O(log n)", "O(n²)"], "Most nodes are near the leaves and need little work.", "Data structures"],
    ["What is the difference between optimistic and pessimistic locking?", "Optimistic checks for conflicts at commit; pessimistic locks data upfront", ["They are the same", "Pessimistic never locks", "Optimistic always locks"], "Optimistic suits low-contention workloads.", "DBMS"],
    ["What does a reverse proxy do?", "Receives client requests and forwards them to backend servers", ["Hides clients from servers", "Stores DNS records", "Compiles code"], "e.g. Nginx in front of app servers.", "System design"],
    ["Which algorithm detects negative-weight cycles in a graph?", "Bellman-Ford", ["Dijkstra", "Prim", "Kruskal"], "Bellman-Ford checks for further relaxation.", "Algorithms"],
    ["What is the purpose of a write-ahead log (WAL)?", "Recording changes before applying them so the database can recover after a crash", ["Caching reads", "Compressing data", "Replicating images"], "WAL ensures durability.", "DBMS"],
    ["What is eventual consistency?", "Replicas converge to the same value if no new updates occur", ["All reads are always up to date", "Data is never consistent", "Consistency checked at compile time"], "Common in distributed databases.", "System design"],
    ["What is the purpose of the Banker's algorithm?", "Deadlock avoidance by checking for safe states", ["CPU scheduling", "Memory compaction", "Disk scheduling"], "It grants requests only if the system stays safe.", "Operating systems"],
    ["What is a trie used for?", "Efficient prefix-based string search", ["Sorting numbers", "Graph shortest paths", "Hashing passwords"], "Tries power autocomplete.", "Data structures"],
    ["What does idempotent mean for an API operation?", "Repeating the request has the same effect as doing it once", ["The request is fast", "The request is cached", "The request can't fail"], "PUT and DELETE should be idempotent.", "Web"],
    ["What is the purpose of a message queue in system design?", "Decoupling producers and consumers for asynchronous processing", ["Storing user passwords", "Rendering web pages", "Replacing databases"], "e.g. Kafka, RabbitMQ.", "System design"],
    ["Which problem is NP-complete?", "Boolean satisfiability (SAT)", ["Sorting", "Binary search", "Shortest path with non-negative weights"], "SAT was the first proven NP-complete problem.", "Algorithms"],
    ["What is a covering index?", "An index that contains all columns needed by a query", ["An index on every column", "A primary key index", "An index on foreign keys only"], "The query is answered from the index alone.", "DBMS"],
    ["What is the purpose of TLS?", "Encrypting and authenticating data in transit", ["Compressing traffic", "Routing packets", "Assigning IP addresses"], "TLS secures HTTPS.", "Security"],
    ["What is SQL injection?", "Inserting malicious SQL through unsanitised input", ["A database backup method", "A fast query technique", "A type of join"], "Prevent it with parameterised queries.", "Security"],
    ["What is the purpose of hashing passwords with a salt?", "Making identical passwords hash differently and resisting precomputed attacks", ["Encrypting passwords reversibly", "Speeding up login", "Compressing passwords"], "Salts defeat rainbow tables.", "Security"],
    ["What is the time complexity of Dijkstra's algorithm with a binary heap?", "O((V + E) log V)", ["O(V²) always", "O(V + E)", "O(E log E log V)"], "Each edge may cause a heap update.", "Algorithms"],
    ["What is a cache stampede?", "Many requests hitting the backend at once when a cached item expires", ["A slow cache", "A full cache", "A corrupted cache"], "Mitigated by locking or early refresh.", "System design"],
    ["What does copy-on-write mean?", "Sharing data until a write, then copying it", ["Copying on every read", "Writing directly to disk", "Duplicating all memory on fork immediately"], "Used by fork() and many data structures.", "Operating systems"],
    ["What is the purpose of a JWT?", "Carrying signed claims for stateless authentication", ["Encrypting databases", "Compressing JSON", "Creating sessions on the server"], "The signature prevents tampering.", "Security"],
    ["What is horizontal scaling?", "Adding more machines to handle load", ["Adding more CPU to one machine", "Optimising code", "Reducing traffic"], "Vertical scaling upgrades one machine.", "System design"],
    ["Which data structure gives O(1) average get and put with LRU eviction?", "Hash map plus doubly linked list", ["Array plus stack", "Binary heap", "Sorted array"], "The list orders by recency; the map finds nodes.", "Data structures"],
    ["What is two-phase commit?", "A protocol to commit a distributed transaction atomically across nodes", ["Committing twice for safety", "A Git workflow", "A backup strategy"], "Prepare then commit phases.", "DBMS"],
    ["What is cross-site scripting (XSS)?", "Injecting malicious scripts into pages viewed by other users", ["Sharing scripts between sites legally", "A CSS technique", "A cross-browser test"], "Escape output to prevent it.", "Security"],
    ["What is the master theorem used for?", "Solving recurrences of divide-and-conquer algorithms", ["Proving correctness", "Optimising databases", "Scheduling processes"], "e.g. T(n) = aT(n/b) + f(n).", "Algorithms"],
    ["What is a CDN?", "A distributed network that serves content from servers near users", ["A database engine", "A coding standard", "A compiler"], "CDNs reduce latency.", "System design"],
    ["What is the difference between a clustered and a non-clustered index?", "A clustered index defines the physical order of rows; non-clustered is a separate structure", ["They are identical", "Non-clustered stores data physically", "A table can have many clustered indexes"], "Only one clustered index per table.", "DBMS"],
    ["What is CSRF?", "Tricking a logged-in user's browser into sending unwanted requests", ["A password hashing method", "A caching strategy", "A type of SQL join"], "Use anti-CSRF tokens or SameSite cookies.", "Security"],
    ["What is the purpose of a circuit breaker pattern?", "Stopping calls to a failing service to prevent cascading failures", ["Encrypting traffic", "Balancing load", "Compressing responses"], "It fails fast and retries later.", "System design"],
    ["What is the time complexity of the KMP string-matching algorithm?", "O(n + m)", ["O(n·m)", "O(n log m)", "O(m²)"], "The prefix table avoids re-checking characters.", "Algorithms"],
    ["What is a zombie process?", "A terminated process whose exit status hasn't been collected by its parent", ["A process using too much CPU", "A virus", "A sleeping process"], "The parent must call wait().", "Operating systems"],
    ["What is database replication used for?", "Copying data to multiple servers for availability and read scaling", ["Compressing data", "Normalising tables", "Encrypting backups"], "Primary-replica setups are common.", "System design"],
    ["What is the purpose of gradient descent in machine learning?", "Minimising a loss function by moving parameters against the gradient", ["Sorting data", "Encrypting models", "Increasing loss"], "It iteratively improves model parameters.", "Machine learning"],
    ["What is overfitting?", "A model that fits training data well but generalises poorly", ["A model that is too simple", "A fast model", "A model with no parameters"], "Regularisation and more data help.", "Machine learning"],
    ["What is the purpose of a confusion matrix?", "Summarising true/false positives and negatives of a classifier", ["Shuffling data", "Visualising images", "Storing weights"], "It underlies precision and recall.", "Machine learning"],
    ["What does precision measure?", "Of predicted positives, how many are actually positive", ["Of actual positives, how many were found", "Overall accuracy", "Training speed"], "Precision = TP / (TP + FP).", "Machine learning"],
    ["What is the vanishing gradient problem?", "Gradients become very small in early layers, slowing learning", ["Gradients disappear from memory", "The loss becomes zero", "Data is lost during training"], "ReLU and residual connections help.", "Machine learning"],
    ["Which technique splits data into k parts to estimate model performance?", "k-fold cross-validation", ["Gradient boosting", "Dropout", "Normalisation"], "Each fold serves once as validation.", "Machine learning"],
    ["What is the purpose of dropout in neural networks?", "Reducing overfitting by randomly disabling neurons during training", ["Speeding up inference", "Increasing parameters", "Removing data"], "It forces redundant representations.", "Machine learning"],
    ["What is the difference between supervised and unsupervised learning?", "Supervised uses labelled data; unsupervised finds patterns in unlabelled data", ["Unsupervised needs labels", "They are the same", "Supervised has no training"], "e.g. classification vs clustering.", "Machine learning"],
    ["What does a transformer model's attention mechanism do?", "Weighs the relevance of each token to every other token", ["Compresses images", "Sorts inputs", "Removes stop words"], "Self-attention captures context.", "Machine learning"],
    ["What is a container (e.g. Docker)?", "A lightweight, isolated runtime packaging an application and its dependencies", ["A virtual machine with its own kernel", "A database", "A programming language"], "Containers share the host kernel.", "DevOps"],
    ["What is the purpose of CI/CD?", "Automating building, testing and deploying code changes", ["Writing documentation", "Designing UIs", "Managing salaries"], "Continuous integration and delivery speed up releases.", "DevOps"],
    ["What is Kubernetes used for?", "Orchestrating containers across clusters", ["Writing SQL", "Version control", "Front-end styling"], "It schedules, scales and heals containers.", "DevOps"],
    ["What is the purpose of an API gateway?", "A single entry point that routes, authenticates and rate-limits API requests", ["A database", "A front-end framework", "A testing tool"], "Common in microservice architectures.", "System design"],
    ["What is a microservices architecture?", "An application built as small, independently deployable services", ["A single large application", "A database design", "A UI pattern"], "Contrasts with a monolith.", "System design"],
    ["What does 'Infrastructure as Code' mean?", "Managing infrastructure through versioned configuration files", ["Writing code on servers manually", "Hardware design", "Code reviews"], "e.g. Terraform.", "DevOps"],
    ["What is the time complexity of finding an element in a balanced BST?", "O(log n)", ["O(n)", "O(1)", "O(n log n)"], "Each comparison discards half the tree.", "Data structures"],
    ["What is a segment tree used for?", "Answering range queries and updates in O(log n)", ["Sorting strings", "Hashing", "Graph colouring"], "e.g. range sums or minimums.", "Data structures"],
    ["What is the purpose of OAuth 2.0?", "Delegated authorisation without sharing passwords", ["Encrypting disks", "Hashing passwords", "Compressing tokens"], "Apps get scoped access tokens.", "Security"],
    ["What is the difference between latency and throughput?", "Latency is time per request; throughput is requests handled per unit time", ["They are the same", "Throughput is time per request", "Latency is data size"], "Systems trade one for the other.", "System design"],
    ["What is a deadlock-prevention strategy?", "Acquiring resources in a fixed global order", ["Adding more CPUs", "Using larger pages", "Disabling interrupts permanently"], "Ordering removes circular wait.", "Operating systems"],
    ["What is the purpose of an ORM?", "Mapping database tables to objects in code", ["Optimising routers", "Managing memory", "Rendering HTML"], "e.g. Hibernate, Mongoose.", "DBMS"],
    ["What is technical debt?", "The future cost of choosing quick solutions over better ones now", ["Money owed for software", "Unpaid licences", "Hardware depreciation"], "It must be paid down with refactoring.", "Software engineering"],
    ["What is the purpose of feature flags?", "Turning features on or off without redeploying code", ["Marking bugs", "Tracking commits", "Compressing code"], "They enable gradual rollouts.", "DevOps"],
  ],
};

module.exports = { buildTechnicalTest: makeTechnicalBuilder(20000, TEMPLATES, BANK), BANK, TEMPLATES };
