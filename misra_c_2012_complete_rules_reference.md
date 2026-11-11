# MISRA C:2012 Guidelines Reference Manual (with Code Examples & Fixes)

This document provides a comprehensive listing of **MISRA C:2012** Directives and Rules as defined by the Motor Industry Software Reliability Association (MISRA). Each entry includes a detailed explanation, a non-compliant C code example, and the compliant solution.

---

## 1. Directives (Process, Environment, & Architecture)

Directives are guidelines where compliance cannot be determined by static analysis of source code alone. They require system documentation, architectural design, process checks, or compiler specifications.

---

### Dir 1.1 (Required)
* **Explanation:** Any implementation-defined behavior (such as endianness, integer representation, or bit-field ordering) on which the program depends must be documented and understood by the team.
* **Non-compliant Example:**
  ```c
  /* Dependent on architecture byte order (endianness) without documentation */
  uint32_t val = 0x12345678U;
  uint8_t first_byte = *(uint8_t *)&val; 
  ```
* **How to Fix:** Document compiler/hardware requirements in your project architecture documentation, or isolate byte operations using bitwise shifts:
  ```c
  /* Compliant: Portable shift operation independent of endianness */
  uint32_t val = 0x12345678U;
  uint8_t first_byte = (uint8_t)(val & 0xFFU);
  ```

---

### Dir 2.1 (Required)
* **Explanation:** All source files in the system must compile cleanly without any errors or warnings under the target compiler set with strict diagnostics enabled.
* **Non-compliant Example:**
  ```c
  int process(void) {
      int x = 10 // Non-compliant: missing semicolon causes compilation error
      return x;
  }
  ```
* **How to Fix:** Ensure all files build with zero syntax, structural, or language constraint errors across all target build configurations.

---

### Dir 3.1 (Required)
* **Explanation:** All source code must be traceable back to documented requirements (software safety requirements, functional requirements, or system specifications).
* **Non-compliant Example:**
  ```c
  /* Undocumented secret backdoor or dead debugging logic in production build */
  void secret_debug_mode(void) {
      system_override = true;
  }
  ```
* **How to Fix:** Annotate functions with requirement traceability tags linking directly to system design documentation:
  ```c
  /* Compliant: Traceable to Software Safety Requirement SSR-FAIL-042 */
  void enter_safe_state(void) {
      actuator_disable();
  }
  ```

---

### Dir 4.1 (Required)
* **Explanation:** Code must be designed to minimize run-time failures, including arithmetic overflow, divide-by-zero, pointer dereferencing errors, and buffer overruns.
* **Non-compliant Example:**
  ```c
  int divide_values(int a, int b) {
      return a / b; /* Non-compliant: susceptible to division by zero if b == 0 */
  }
  ```
* **How to Fix:** Add defensive checks prior to operations that could result in runtime exceptions.
  ```c
  int divide_values(int a, int b, int *out_result) {
      int status = -1;
      if ((b != 0) && (out_result != NULL)) {
          *out_result = a / b;
          status = 0;
      }
      return status;
  }
  ```

---

### Dir 4.2 (Advisory)
* **Explanation:** All usage of assembly language must be explicitly documented to specify register usage, side effects, and memory boundaries.
* **Non-compliant Example:**
  ```c
  void reset_cpu(void) {
      __asm__("NOP"); /* Undocumented inline assembly */
  }
  ```
* **How to Fix:** Document the assembly instructions and encapsulate them inside documented wrapper functions:
  ```c
  /**
   * @brief Executes a hardware NOP operation for timing alignment.
   * Target: ARM Cortex-M4
   */
  void reset_cpu(void) {
      __asm__ volatile ("nop");
  }
  ```

---

### Dir 4.3 (Required)
* **Explanation:** Assembly language instructions must be encapsulated inside standalone functions or macros and isolated from C logic.
* **Non-compliant Example:**
  ```c
  int compute_and_disable_interrupts(int a, int b) {
      int res = a + b;
      __asm__("cpsid i"); /* Non-compliant: assembly mixed in C business logic */
      return res;
  }
  ```
* **How to Fix:** Encapsulate assembly commands inside single-purpose helper functions.
  ```c
  static inline void disable_interrupts(void) {
      __asm__ volatile ("cpsid i" : : : "memory");
  }

  int compute(int a, int b) {
      int res = a + b;
      disable_interrupts(); /* Compliant: assembly encapsulated in dedicated wrapper */
      return res;
  }
  ```

---

### Dir 4.4 (Advisory)
* **Explanation:** Sections of code should not be disabled by placing them inside comments. Use preprocessor conditional compilation or remove unused code entirely.
* **Non-compliant Example:**
  ```c
  void update_sensor(void) {
      /* 
      read_old_sensor();
      calibrate_old(); 
      */
      read_new_sensor();
  }
  ```
* **How to Fix:** Remove commented-out code blocks or use `#if 0` with explicit explanations if temporary exclusion is needed.
  ```c
  void update_sensor(void) {
      read_new_sensor(); /* Compliant: old code removed from source */
  }
  ```

---

### Dir 4.5 (Advisory)
* **Explanation:** Identifiers in the same namespace with overlapping visibility should be typographically unambiguous (avoid relying on combinations of `1`/`l`/`I` or `O`/`0`).
* **Non-compliant Example:**
  ```c
  int total_l1_value;
  int total_I1_value; /* Non-compliant: l1 and I1 are visually ambiguous */
  ```
* **How to Fix:** Choose distinct, clear identifier names.
  ```c
  int total_level1_value;
  int total_index1_value; /* Compliant: clear and distinct names */
  ```

---

### Dir 4.6 (Advisory)
* **Explanation:** Standard basic numeric types (`int`, `short`, `long`, `char`) should not be used directly. Explicit typedefs indicating size and signedness (e.g., `uint32_t`, `int16_t` from `<stdint.h>`) should be used instead.
* **Non-compliant Example:**
  ```c
  unsigned long counter; /* Non-compliant: width varies between platforms */
  ```
* **How to Fix:** Use standard exact-width integer types.
  ```c
  uint32_t counter; /* Compliant: explicit width and signedness */
  ```

---

### Dir 4.7 (Required)
* **Explanation:** If a function returns error information, that error status must be explicitly tested by the caller.
* **Non-compliant Example:**
  ```c
  void process_file(void) {
      fclose(fp); /* Non-compliant: error return status ignored */
  }
  ```
* **How to Fix:** Store and check return values from functions that report status.
  ```c
  void process_file(void) {
      if (fclose(fp) != 0) {
          handle_file_error();
      }
  }
  ```

---

### Dir 4.8 (Advisory)
* **Explanation:** If a pointer to a `struct` or `union` is never dereferenced within a translation unit, the internal layout of the structure should be hidden (opaque pointer design pattern).
* **Non-compliant Example:**
  ```c
  /* header.h exposed to all callers even though internal fields are unused */
  struct DeviceHandle {
      uint32_t reg_base;
      uint8_t buffer[256];
  };
  ```
* **How to Fix:** Forward-declare the structure in the header and define its members only in the implementation file.
  ```c
  /* public_header.h */
  struct DeviceHandle; /* Forward declaration (opaque handle) */

  /* private_impl.c */
  struct DeviceHandle {
      uint32_t reg_base;
      uint8_t buffer[256];
  };
  ```

---

### Dir 4.9 (Advisory)
* **Explanation:** A inline function should be used in preference to a function-like macro where they are interchangeable to ensure type checking and prevent double-evaluation bugs.
* **Non-compliant Example:**
  ```c
  #define MAX(a, b) (((a) > (b)) ? (a) : (b)) /* Non-compliant: macro risk */
  ```
* **How to Fix:** Replace function-like macros with type-safe inline functions.
  ```c
  static inline int32_t max_int32(int32_t a, int32_t b) {
      return (a > b) ? a : b;
  }
  ```

---

### Dir 4.10 (Required)
* **Explanation:** Header files must be protected against multiple inclusion using include guards or `#pragma once`.
* **Non-compliant Example:**
  ```c
  /* my_header.h with no include guard */
  void calculate(void);
  ```
* **How to Fix:** Wrap the entire header contents in `#ifndef`, `#define`, and `#endif`.
  ```c
  #ifndef MY_HEADER_H
  #define MY_HEADER_H

  void calculate(void);

  #endif /* MY_HEADER_H */
  ```

---

### Dir 4.11 (Required)
* **Explanation:** Parameters passed to standard library functions must be validated before calling to prevent undefined behavior.
* **Non-compliant Example:**
  ```c
  void print_sub(const char *str) {
      char buf[10];
      memcpy(buf, str, 100); /* Non-compliant: no size check on source string */
  }
  ```
* **How to Fix:** Check boundary conditions and parameter ranges prior to library function invocations.
  ```c
  void print_sub(const char *str) {
      char buf[10];
      if ((str != NULL) && (strlen(str) < sizeof(buf))) {
          (void)memcpy(buf, str, strlen(str) + 1U);
      }
  }
  ```

---

### Dir 4.12 (Required)
* **Explanation:** Dynamic memory allocation (`malloc`, `calloc`, `realloc`, `free`) shall not be used in embedded safety-critical software due to risk of heap fragmentation, memory leaks, and non-deterministic run times.
* **Non-compliant Example:**
  ```c
  uint8_t *buffer = (uint8_t *)malloc(1024); /* Non-compliant */
  ```
* **How to Fix:** Allocate memory statically at compile time.
  ```c
  static uint8_t buffer[1024]; /* Compliant: static allocation */
  ```

---

### Dir 4.13 (Advisory)
* **Explanation:** Functions designed to operate on a shared resource (such as lock/unlock or open/close) should be called in a paired, appropriate sequence.
* **Non-compliant Example:**
  ```c
  void write_data(void) {
      lock_mutex();
      if (check_condition() == false) {
          return; /* Non-compliant: mutex remains locked when returning early */
      }
      unlock_mutex();
  }
  ```
* **How to Fix:** Ensure resources are explicitly cleaned up before returning.
  ```c
  void write_data(void) {
      lock_mutex();
      if (check_condition() == true) {
          perform_write();
      }
      unlock_mutex(); /* Compliant: mutex released on all execution paths */
  }
  ```

---

### Dir 4.14 (Required)
* **Explanation:** The validity of values received from external interfaces (CAN bus, UART, ADC, shared memory) must be validated before processing.
* **Non-compliant Example:**
  ```c
  void process_adc_raw(uint16_t adc_val) {
      /* Non-compliant: raw input used directly as array index without check */
      sensor_table[adc_val] = 1; 
  }
  ```
* **How to Fix:** Validate all input boundaries against permissible ranges.
  ```c
  #define MAX_SENSOR_ENTRIES (100U)

  void process_adc_raw(uint16_t adc_val) {
      if (adc_val < MAX_SENSOR_ENTRIES) {
          sensor_table[adc_val] = 1;
      }
  }
  ```

---

## 2. Standard C Environment (Section 1)

---

### Rule 1.1 (Required)
* **Explanation:** Programs must strictly adhere to ISO C language standards without violating syntax limits or compiler constraints.
* **Non-compliant Example:**
  ```c
  /* Exceeding compiler max nesting levels or invalid standard syntax */
  void nested(void) { {{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{ int x = 0; }}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
  ```
* **How to Fix:** Restructure complex nested code blocks to adhere to ISO C bounds and clean syntax.

---

### Rule 1.2 (Advisory)
* **Explanation:** Non-standard compiler extensions (such as inline GNU assembly syntax extensions or custom keywords) should not be used unless wrapped and documented.
* **Non-compliant Example:**
  ```c
  typeof(a) b = a; /* Non-compliant: GNU extension 'typeof' */
  ```
* **How to Fix:** Use Standard C operators.
  ```c
  uint32_t b = a; /* Compliant: Standard C type declaration */
  ```

---

### Rule 1.3 (Mandatory)
* **Explanation:** Code shall contain no occurrences of undefined behavior (e.g., dereferencing NULL pointers, shifting by negative offsets) or critical unspecified behavior.
* **Non-compliant Example:**
  ```c
  int *ptr = NULL;
  *ptr = 42; /* Non-compliant: Undefined behavior (dereferencing NULL) */
  ```
* **How to Fix:** Guard pointers against `NULL` prior to dereferencing.
  ```c
  int val = 0;
  int *ptr = &val;
  if (ptr != NULL) {
      *ptr = 42; /* Compliant */
  }
  ```

---

## 3. Unused Code (Section 2)

---

### Rule 2.1 (Required)
* **Explanation:** Code must not contain unreachable logic (statements that can never be executed under any path).
* **Non-compliant Example:**
  ```c
  int compute(void) {
      return 10;
      int y = 20; /* Non-compliant: unreachable statement */
  }
  ```
* **How to Fix:** Delete unreachable statements.
  ```c
  int compute(void) {
      return 10; /* Compliant */
  }
  ```

---

### Rule 2.2 (Required)
* **Explanation:** Projects shall not contain dead code (statements whose execution produces no effect on outputs or program state).
* **Non-compliant Example:**
  ```c
  void calculate(void) {
      int x = 5;
      x + 10; /* Non-compliant: evaluated value is discarded */
  }
  ```
* **How to Fix:** Remove operations that produce no side effect.
  ```c
  void calculate(void) {
      int x = 5;
      x = x + 10; /* Compliant: result used */
  }
  ```

---

### Rule 2.3 (Advisory)
* **Explanation:** Types defined via `typedef` should be removed if they are not used anywhere in the project.
* **Non-compliant Example:**
  ```c
  typedef uint32_t UnusedType; /* Non-compliant if never used */
  ```
* **How to Fix:** Remove unused `typedef` declarations from headers and source files.

---

### Rule 2.4 (Advisory)
* **Explanation:** `struct`, `union`, or `enum` tag declarations that are never instantiated or referenced should be removed.
* **Non-compliant Example:**
  ```c
  enum UnusedTag { ALPHA, BETA }; /* Non-compliant if tag is unused */
  ```
* **How to Fix:** Delete unused tag definitions.

---

### Rule 2.5 (Advisory)
* **Explanation:** Macro definitions (`#define`) that are never expanded within the project should be removed.
* **Non-compliant Example:**
  ```c
  #define UNUSED_TIMEOUT (500U) /* Non-compliant if unused */
  ```
* **How to Fix:** Remove unused macro definitions.

---

### Rule 2.6 (Advisory)
* **Explanation:** Label declarations for `goto` targets should not exist if they are never jumped to.
* **Non-compliant Example:**
  ```c
  void test(void) {
  unused_label: /* Non-compliant: label is never referenced */
      return;
  }
  ```
* **How to Fix:** Delete unused labels.

---

### Rule 2.7 (Advisory)
* **Explanation:** Parameters defined in a function signature should be used inside the body, or marked/documented if mandated by an interface callback.
* **Non-compliant Example:**
  ```c
  void handle_event(int event_id, int unused_arg) {
      process_event(event_id); /* Non-compliant: unused_arg never read */
  }
  ```
* **How to Fix:** Remove unused parameters, or cast them to `(void)` to document intent.
  ```c
  void handle_event(int event_id, int unused_arg) {
      (void)unused_arg; /* Compliant: explicitly cast to void */
      process_event(event_id);
  }
  ```

---

## 4. Comments (Section 3)

---

### Rule 3.1 (Required)
* **Explanation:** Nested comment character sequences (`/*` or `//`) must not be placed inside existing comments, as this leads to unintended code activation/deactivation.
* **Non-compliant Example:**
  ```c
  /* Comment starts here 
     /* Nested comment */
     x = y; /* This line is accidentally inside the outer comment! */
  */
  ```
* **How to Fix:** Avoid nesting comment tokens within comments.
  ```c
  /* Outer comment block describing function logic */
  x = y;
  ```

---

### Rule 3.2 (Required)
* **Explanation:** Line-splicing (ending a line with `\`) must not be used at the end of C++ style `//` comments, because it will cause the next code line to be treated as part of the comment.
* **Non-compliant Example:**
  ```c
  // This is a comment line \
  execute_critical_safety_routine(); /* Non-compliant: hidden by line splicing! */
  ```
* **How to Fix:** Remove trailing backslashes from single-line comments.
  ```c
  // This is a clean comment line
  execute_critical_safety_routine(); /* Compliant */
  ```

---

## 5. Character Sets & Lexical Conventions (Section 4)

---

### Rule 4.1 (Required)
* **Explanation:** Octal and hexadecimal escape sequences in strings must be explicitly terminated (using string concatenation or fixed length) to prevent adjacent characters from being misinterpreted as part of the escape sequence.
* **Non-compliant Example:**
  ```c
  const char *str = "\x12345"; /* Non-compliant: '345' treated as part of hex escape */
  ```
* **How to Fix:** Break up string literals to terminate the escape sequence.
  ```c
  const char *str = "\x12" "345"; /* Compliant */
  ```

---

### Rule 4.2 (Advisory)
* **Explanation:** Trigraphs (such as `??=` for `#`) should not be used, as they reduce readability and can cause accidental token substitution.
* **Non-compliant Example:**
  ```c
  /* Non-compliant: Trigraph for '#' */
  ??=define MAX 100 
  ```
* **How to Fix:** Use standard ASCII preprocessor and operator symbols.
  ```c
  #define MAX 100 /* Compliant */
  ```

---

## 6. Identifiers & Scope (Section 5)

---

### Rule 5.1 (Required)
* **Explanation:** External identifiers must be distinct in their first 31 characters to avoid linker collisions on legacy toolchains.
* **Non-compliant Example:**
  ```c
  int engine_management_system_parameter_alpha;
  int engine_management_system_parameter_beta; /* Non-compliant if toolchain truncates at 31 chars */
  ```
* **How to Fix:** Keep external identifiers distinct within the first 31 characters.
  ```c
  int ems_param_alpha;
  int ems_param_beta; /* Compliant */
  ```

---

### Rule 5.2 (Required)
* **Explanation:** Identifiers declared within the same scope and namespace must be unique.
* **Non-compliant Example:**
  ```c
  void process(void) {
      int count = 0;
      int count = 1; /* Non-compliant: duplicate identifier */
  }
  ```
* **How to Fix:** Ensure distinct variable names within a scope.

---

### Rule 5.3 (Required)
* **Explanation:** An identifier declared in an inner scope must not hide an identifier declared in an outer scope.
* **Non-compliant Example:**
  ```c
  int global_val = 100;

  void update(void) {
      int global_val = 50; /* Non-compliant: inner variable shadows outer global */
  }
  ```
* **How to Fix:** Rename the inner variable to prevent scope shadowing.
  ```c
  int global_val = 100;

  void update(void) {
      int local_val = 50; /* Compliant */
  }
  ```

---

### Rule 5.4 (Required)
* **Explanation:** Macro identifiers must be distinct from other macro identifiers.
* **Non-compliant Example:**
  ```c
  #define SENSOR_READING_MAX_LIMIT (100U)
  #define SENSOR_READING_MAX_LIMIT (200U) /* Non-compliant: duplicate macro definition */
  ```
* **How to Fix:** Use distinct macro names or `#undef` before redefining.

---

### Rule 5.5 (Required)
* **Explanation:** Identifiers shall be distinct from macro names in the same translation unit.
* **Non-compliant Example:**
  ```c
  #define STATUS_OK (0U)
  int STATUS_OK = 0; /* Non-compliant: identifier collides with macro name */
  ```
* **How to Fix:** Distinguish variable names from macro names using naming conventions (e.g., ALL_CAPS for macros).

---

### Rule 5.6 (Required)
* **Explanation:** A `typedef` name shall be a unique identifier across the project.
* **Non-compliant Example:**
  ```c
  typedef uint32_t speed_t;
  typedef uint16_t speed_t; /* Non-compliant: duplicate typedef name */
  ```
* **How to Fix:** Avoid redefining existing `typedef` identifiers.

---

### Rule 5.7 (Required)
* **Explanation:** Tag names for `struct`, `union`, or `enum` must be unique identifiers across the project.
* **Non-compliant Example:**
  ```c
  struct Node { int data; };
  union Node { int data_int; float data_flt; }; /* Non-compliant: duplicate tag 'Node' */
  ```
* **How to Fix:** Use distinct tag names for separate data structures.

---

### Rule 5.8 (Required)
* **Explanation:** External linkage objects or functions must have globally unique identifiers.
* **Non-compliant Example:**
  ```c
  /* file1.c */ int status = 0;
  /* file2.c */ int status = 1; /* Non-compliant: global identifier collision */
  ```
* **How to Fix:** Rename variables or apply `static` storage specifiers if linkage is internal to a single file.

---

### Rule 5.9 (Advisory)
* **Explanation:** Identifiers defining objects or functions with internal linkage should be unique across translation units to simplify debugging.
* **Non-compliant Example:**
  ```c
  /* file1.c */ static int counter = 0;
  /* file2.c */ static int counter = 0; /* Non-compliant: identical internal names */
  ```
* **How to Fix:** Give file-scope static variables distinct, module-prefixed names:
  ```c
  /* file1.c */ static int f1_counter = 0;
  /* file2.c */ static int f2_counter = 0; /* Compliant */
  ```

---

## 7. Types (Section 6)

---

### Rule 6.1 (Required)
* **Explanation:** Bit-fields shall only be declared with explicitly `signed int` or `unsigned int` types (or `bool`). Generic `int` is implementation-defined regarding signedness.
* **Non-compliant Example:**
  ```c
  struct Flags {
      int flag1 : 1; /* Non-compliant: plain 'int' signedness is compiler-dependent */
  };
  ```
* **How to Fix:** Explicitly state signedness.
  ```c
  struct Flags {
      unsigned int flag1 : 1; /* Compliant */
  };
  ```

---

### Rule 6.2 (Required)
* **Explanation:** Single-bit named bit-fields must not be declared as signed types, because a 1-bit signed integer can only store values 0 and -1 (not 1).
* **Non-compliant Example:**
  ```c
  struct Controls {
      signed int mode : 1; /* Non-compliant: 1-bit signed integer stores 0 or -1 */
  };
  ```
* **How to Fix:** Declare single-bit fields as `unsigned int` or `bool`.
  ```c
  struct Controls {
      unsigned int mode : 1; /* Compliant */
  };
  ```

---

## 8. Literals & Constants (Section 7)

---

### Rule 7.1 (Required)
* **Explanation:** Octal constants (leading zero, e.g., `012`) must not be used, as they are easily confused with decimal constants.
* **Non-compliant Example:**
  ```c
  int code = 052; /* Non-compliant: octal literal equals 42 in decimal */
  ```
* **How to Fix:** Use decimal or hexadecimal representations.
  ```c
  int code = 42;    /* Compliant decimal */
  int hex_code = 0x2AU; /* Compliant hex */
  ```

---

### Rule 7.2 (Required)
* **Explanation:** A 'u' or 'U' suffix must be applied to all unsigned integer literal constants to avoid implicit type ambiguity.
* **Non-compliant Example:**
  ```c
  uint32_t mask = 0x80000000; /* Non-compliant: missing 'U' suffix */
  ```
* **How to Fix:** Append the `U` suffix to unsigned constants.
  ```c
  uint32_t mask = 0x80000000U; /* Compliant */
  ```

---

### Rule 7.3 (Required)
* **Explanation:** Lowercase 'l' must not be used in numeric suffixes because it is visually identical to the digit '1'. Always use uppercase 'L'.
* **Non-compliant Example:**
  ```c
  int64_t val = 100l; /* Non-compliant: lowercase 'l' */
  ```
* **How to Fix:** Use uppercase `L`.
  ```c
  int64_t val = 100L; /* Compliant */
  ```

---

### Rule 7.4 (Required)
* **Explanation:** String literals must not be assigned to non-const pointers, because writing to string literal memory causes undefined behavior.
* **Non-compliant Example:**
  ```c
  char *str = "Hello"; /* Non-compliant: missing const qualifier */
  ```
* **How to Fix:** Use a pointer to `const char`.
  ```c
  const char *str = "Hello"; /* Compliant */
  ```

---

## 9. Declarations & Definitions (Section 8)

---

### Rule 8.1 (Required)
* **Explanation:** Types must be explicitly specified in all declarations. Implicit `int` defaults are forbidden.
* **Non-compliant Example:**
  ```c
  static count = 0; /* Non-compliant: implicit int type */
  ```
* **How to Fix:** Explicitly state the data type.
  ```c
  static int32_t count = 0; /* Compliant */
  ```

---

### Rule 8.2 (Required)
* **Explanation:** Function prototypes must be declared in prototype form with named parameters. Empty parameter lists are forbidden (use `void`).
* **Non-compliant Example:**
  ```c
  int calculate(); /* Non-compliant: missing parameter list / void */
  ```
* **How to Fix:** State parameter names and types explicitly or specify `void`.
  ```c
  int calculate(void); /* Compliant */
  ```

---

### Rule 8.3 (Required)
* **Explanation:** All declarations of an object or function must use identical parameter names, types, and qualifiers across all files.
* **Non-compliant Example:**
  ```c
  /* Header.h */  void update(int value);
  /* Source.c */  void update(int speed) { /* ... */ } /* Non-compliant: parameter name mismatch */
  ```
* **How to Fix:** Use exact matching names across declarations and definitions.
  ```c
  /* Header.h */  void update(int value);
  /* Source.c */  void update(int value) { /* ... */ } /* Compliant */
  ```

---

### Rule 8.4 (Required)
* **Explanation:** A compatible declaration must be visible when an object or function with external linkage is defined (i.e., include the corresponding header file).
* **Non-compliant Example:**
  ```c
  /* my_module.c */
  int global_sensor_val = 10; /* Non-compliant: no header file included declaring global_sensor_val */
  ```
* **How to Fix:** Include the header file that contains the `extern` declaration.
  ```c
  #include "my_module.h"
  int global_sensor_val = 10; /* Compliant */
  ```

---

### Rule 8.5 (Required)
* **Explanation:** An external object or function shall be declared in exactly one header file to maintain a single source of truth.
* **Non-compliant Example:**
  ```c
  /* file1.c */ extern int mode;
  /* file2.c */ extern int mode; /* Non-compliant: repeated extern declarations across C files */
  ```
* **How to Fix:** Declare `extern int mode;` in one central header file and `#include` it.

---

### Rule 8.6 (Required)
* **Explanation:** An identifier with external linkage must have exactly one definition across the entire project.
* **Non-compliant Example:**
  ```c
  /* file1.c */ int system_state = 0;
  /* file2.c */ int system_state = 0; /* Non-compliant: duplicate external definition */
  ```
* **How to Fix:** Define the variable once in a single `.c` file and reference it via header `extern` declarations elsewhere.

---

### Rule 8.7 (Advisory)
* **Explanation:** Functions and objects should be declared `static` (internal linkage) if they are not referenced outside their translation unit.
* **Non-compliant Example:**
  ```c
  int internal_helper(void) { return 1; } /* Non-compliant: exposed externally unnecessarily */
  ```
* **How to Fix:** Add the `static` specifier.
  ```c
  static int internal_helper(void) { return 1; } /* Compliant */
  ```

---

### Rule 8.8 (Required)
* **Explanation:** The `static` keyword must be present on all declarations and definitions of objects and functions with internal linkage.
* **Non-compliant Example:**
  ```c
  static int foo(void);
  int foo(void) { return 0; } /* Non-compliant: missing static on definition */
  ```
* **How to Fix:** Place `static` on both the prototype and definition.
  ```c
  static int foo(void);
  static int foo(void) { return 0; } /* Compliant */
  ```

---

### Rule 8.9 (Advisory)
* **Explanation:** An object should be defined at block scope (inside a function) if it is only accessed within that single function.
* **Non-compliant Example:**
  ```c
  static int step_counter = 0; /* Non-compliant: file-scope variable used only in process() */

  void process(void) {
      step_counter++;
  }
  ```
* **How to Fix:** Move variable definition inside function block.
  ```c
  void process(void) {
      static int step_counter = 0; /* Compliant */
      step_counter++;
  }
  ```

---

### Rule 8.10 (Required)
* **Explanation:** Inline functions must be declared with the `static` storage specifier to prevent symbol linkage ambiguities.
* **Non-compliant Example:**
  ```c
  inline int add(int a, int b) { return a + b; } /* Non-compliant: missing static */
  ```
* **How to Fix:** Declare as `static inline`.
  ```c
  static inline int add(int a, int b) { return a + b; } /* Compliant */
  ```

---

### Rule 8.11 (Advisory)
* **Explanation:** Arrays declared with external linkage should have their size explicitly specified in the `extern` declaration.
* **Non-compliant Example:**
  ```c
  extern int lookup_table[]; /* Non-compliant: array bound omitted */
  ```
* **How to Fix:** Include the array size.
  ```c
  extern int lookup_table[256]; /* Compliant */
  ```

---

### Rule 8.12 (Required)
* **Explanation:** Within an `enum` list, implicit element values must not conflict with explicit values assigned elsewhere in the enum.
* **Non-compliant Example:**
  ```c
  enum Mode {
      MODE_A = 1,
      MODE_B,      /* Implicitly 2 */
      MODE_C = 1   /* Non-compliant: duplicate value 1 */
  };
  ```
* **How to Fix:** Assign unique values to each enum element.

---

### Rule 8.13 (Advisory)
* **Explanation:** A pointer parameter should point to a `const`-qualified type if the function does not modify the underlying object.
* **Non-compliant Example:**
  ```c
  void print_val(int *p) {
      printf("%d", *p); /* Non-compliant: p does not modify *p, should be const */
  }
  ```
* **How to Fix:** Add `const` qualifier to pointer parameter.
  ```c
  void print_val(const int *p) {
      printf("%d", *p); /* Compliant */
  }
  ```

---

### Rule 8.14 (Required)
* **Explanation:** The C99 `restrict` type qualifier shall not be used, as it introduces compiler optimization assumptions that static analysis tools cannot easily verify.
* **Non-compliant Example:**
  ```c
  void copy(int * restrict dst, const int * restrict src); /* Non-compliant */
  ```
* **How to Fix:** Remove `restrict` qualifier.
  ```c
  void copy(int *dst, const int *src); /* Compliant */
  ```

---

## 10. Initialization (Section 9)

---

### Rule 9.1 (Mandatory)
* **Explanation:** Local stack variables (automatic objects) must be assigned a value before being read.
* **Non-compliant Example:**
  ```c
  void compute(void) {
      int total;
      int x = total + 5; /* Non-compliant: total read uninitialized */
  }
  ```
* **How to Fix:** Initialize local variables upon declaration.
  ```c
  void compute(void) {
      int total = 0;
      int x = total + 5; /* Compliant */
  }
  ```

---

### Rule 9.2 (Required)
* **Explanation:** Initializers for nested aggregates (`struct` or array) or unions must be explicitly enclosed in braces `{}`.
* **Non-compliant Example:**
  ```c
  int arr[2][2] = { 1, 2, 3, 4 }; /* Non-compliant: missing inner braces */
  ```
* **How to Fix:** Enclose sub-arrays/structures in braces.
  ```c
  int arr[2][2] = { { 1, 2 }, { 3, 4 } }; /* Compliant */
  ```

---

### Rule 9.3 (Required)
* **Explanation:** Arrays shall not be partially initialized. Either initialize all elements or none.
* **Non-compliant Example:**
  ```c
  int values[5] = { 1, 2 }; /* Non-compliant: 3 elements implicitly zeroed */
  ```
* **How to Fix:** Fully initialize all elements or initialize the array to zero completely using `{ 0 }`.
  ```c
  int values[5] = { 1, 2, 0, 0, 0 }; /* Compliant */
  /* Or */
  int values[5] = { 0 };             /* Compliant complete zero initialization */
  ```

---

### Rule 9.4 (Required)
* **Explanation:** An element of an object shall not be initialized more than once in an initializer list.
* **Non-compliant Example:**
  ```c
  int arr[3] = { [0] = 1, [0] = 2, 3 }; /* Non-compliant: index 0 initialized twice */
  ```
* **How to Fix:** Ensure each element index is initialized once.

---

### Rule 9.5 (Required)
* **Explanation:** Where designated initializers are used for array objects, the array size must be explicitly declared in the type definition.
* **Non-compliant Example:**
  ```c
  int arr[] = { [0] = 1, [2] = 5 }; /* Non-compliant: size inferred implicitly */
  ```
* **How to Fix:** Explicitly state array dimension.
  ```c
  int arr[3] = { [0] = 1, [2] = 5 }; /* Compliant */
  ```

---

## 11. Essential Type Model (Section 10)

---

### Rule 10.1 (Required)
* **Explanation:** Operands shall not be used with inappropriate essential types (e.g., performing bitwise operations on signed integers or using floating-point types as array indexes).
* **Non-compliant Example:**
  ```c
  int32_t val = -5;
  int32_t res = val << 2; /* Non-compliant: bitwise shift on signed integer */
  ```
* **How to Fix:** Cast or operate on explicit unsigned integer types.
  ```c
  uint32_t val = 5U;
  uint32_t res = val << 2U; /* Compliant */
  ```

---

### Rule 10.2 (Required)
* **Explanation:** Expressions of character type shall not be used in inappropriate arithmetic contexts (e.g., adding numbers directly to raw character types).
* **Non-compliant Example:**
  ```c
  char c = 'a';
  char next = c + 3; /* Non-compliant: character arithmetic */
  ```
* **How to Fix:** Cast character to integer or use explicit character conversions.

---

### Rule 10.3 (Required)
* **Explanation:** An expression value shall not be assigned to an object with a narrower essential type or a different type category without an explicit cast.
* **Non-compliant Example:**
  ```c
  uint32_t big = 500U;
  uint8_t small;
  small = big; /* Non-compliant: implicit truncation */
  ```
* **How to Fix:** Add an explicit cast to acknowledge truncation.
  ```c
  small = (uint8_t)big; /* Compliant */
  ```

---

### Rule 10.4 (Required)
* **Explanation:** Both operands of a binary operator must have the same essential type category (e.g., do not mix signed and unsigned types in addition).
* **Non-compliant Example:**
  ```c
  uint32_t u = 10U;
  int32_t  s = -5;
  uint32_t res = u + s; /* Non-compliant: mixing signed and unsigned */
  ```
* **How to Fix:** Cast one operand explicitly so types match.
  ```c
  uint32_t res = u + (uint32_t)s; /* Compliant */
  ```

---

### Rule 10.5 (Advisory)
* **Explanation:** The value of an expression should not be explicitly cast to an inappropriate essential type (e.g., casting a float to an enum).
* **Non-compliant Example:**
  ```c
  float f = 1.5f;
  enum Mode m = (enum Mode)f; /* Non-compliant */
  ```
* **How to Fix:** Convert through intermediate integer types or explicit mapping logic.

---

### Rule 10.6 (Required)
* **Explanation:** The value of a composite expression (e.g., `a + b`) shall not be assigned to an object of wider essential type without casting an operand first to prevent hidden overflow.
* **Non-compliant Example:**
  ```c
  uint16_t a = 60000U;
  uint16_t b = 10000U;
  uint32_t total = a + b; /* Non-compliant: addition overflows 16-bit before assignment */
  ```
* **How to Fix:** Cast an operand to the wider type prior to addition.
  ```c
  uint32_t total = (uint32_t)a + b; /* Compliant */
  ```

---

### Rule 10.7 (Required)
* **Explanation:** Operands of a composite expression shall not undergo implicit conversions to wider types when combined with wider variables.
* **Non-compliant Example:**
  ```c
  uint16_t a = 10U;
  uint16_t b = 20U;
  uint32_t c = 100U;
  uint32_t res = (a + b) + c; /* Non-compliant implicit conversion inside composite */
  ```
* **How to Fix:** Explicitly cast operands to wider types.

---

### Rule 10.8 (Required)
* **Explanation:** The value of a composite expression shall not be cast to a different essential type category or wider type.
* **Non-compliant Example:**
  ```c
  uint16_t a = 10U;
  uint16_t b = 20U;
  uint32_t res = (uint32_t)(a + b); /* Non-compliant: cast applied to composite result */
  ```
* **How to Fix:** Cast individual operands before computing composite result.
  ```c
  uint32_t res = (uint32_t)a + (uint32_t)b; /* Compliant */
  ```

---

## 12. Pointer Conversions (Section 11)

---

### Rule 11.1 (Required)
* **Explanation:** Conversions shall not be performed between a pointer to a function and any other type (including object pointers or integers).
* **Non-compliant Example:**
  ```c
  void (*fp)(void);
  void *vp = (void *)fp; /* Non-compliant: function pointer cast to void pointer */
  ```
* **How to Fix:** Keep function pointers distinct; do not cast them to generic object pointers.

---

### Rule 11.2 (Required)
* **Explanation:** Conversions shall not be performed between a pointer to an incomplete type and any other type.
* **Non-compliant Example:**
  ```c
  struct Opaque *p;
  uint32_t addr = (uint32_t)p; /* Non-compliant */
  ```
* **How to Fix:** Avoid type casting opaque structure handles.

---

### Rule 11.3 (Required)
* **Explanation:** A cast shall not be performed between a pointer to an object type and a pointer to a different object type due to alignment fault risks.
* **Non-compliant Example:**
  ```c
  uint8_t buffer[4] = {0};
  uint32_t *val = (uint32_t *)buffer; /* Non-compliant: strict aliasing / alignment violation */
  ```
* **How to Fix:** Use `memcpy` to copy bytes safely between different types.
  ```c
  uint8_t buffer[4] = {0};
  uint32_t val;
  (void)memcpy(&val, buffer, sizeof(val)); /* Compliant */
  ```

---

### Rule 11.4 (Advisory)
* **Explanation:** Conversions should not be performed between a pointer to an object and an integer type unless addressing hardware memory-mapped registers.
* **Non-compliant Example:**
  ```c
  int x = 10;
  uint32_t addr = (uint32_t)&x; /* Non-compliant pointer to int conversion */
  ```
* **How to Fix:** Avoid treating pointers as integers in general software logic.

---

### Rule 11.5 (Advisory)
* **Explanation:** Conversion should not be performed from a pointer to `void` into a pointer to an object type.
* **Non-compliant Example:**
  ```c
  void *vptr = get_buffer();
  uint32_t *iptr = (uint32_t *)vptr; /* Non-compliant */
  ```
* **How to Fix:** Pass typed object pointers directly whenever possible.

---

### Rule 11.6 (Required)
* **Explanation:** Casts shall not be performed between a pointer to `void` and an arithmetic type (integer or float).
* **Non-compliant Example:**
  ```c
  void *vp = (void *)0x1000U; /* Non-compliant */
  ```
* **How to Fix:** Use uintptr_t or dedicated memory mapping macros for hardware base addresses.

---

### Rule 11.7 (Required)
* **Explanation:** Casts shall not be performed between a pointer to an object and a non-integer arithmetic type (such as `float`).
* **Non-compliant Example:**
  ```c
  float f = 3.14f;
  uint32_t *p = (uint32_t *)&f; /* Non-compliant pointer reinterpret */
  ```
* **How to Fix:** Use standard memcpy operations for bit pattern analysis.

---

### Rule 11.8 (Required)
* **Explanation:** Casts shall not remove `const` or `volatile` qualification from a pointer's referenced type.
* **Non-compliant Example:**
  ```c
  void write_data(const int *p) {
      int *mutable_p = (int *)p; /* Non-compliant: removes const qualifier */
      *mutable_p = 10;
  }
  ```
* **How to Fix:** Retain `const` qualifiers throughout parameter chains.

---

### Rule 11.9 (Required)
* **Explanation:** The macro `NULL` shall be the only permitted form of null pointer constant (do not use raw `0`).
* **Non-compliant Example:**
  ```c
  int *ptr = 0; /* Non-compliant: raw 0 used as null pointer */
  ```
* **How to Fix:** Use `NULL`.
  ```c
  int *ptr = NULL; /* Compliant */
  ```

---

## 13. Expressions (Section 12)

---

### Rule 12.1 (Advisory)
* **Explanation:** Precedence of operators within complex expressions should be made explicit using parentheses.
* **Non-compliant Example:**
  ```c
  int res = a + b << c * d; /* Non-compliant: relies on complex precedence */
  ```
* **How to Fix:** Add explicit parenthesized groupings.
  ```c
  int res = (a + b) << (c * d); /* Compliant */
  ```

---

### Rule 12.2 (Required)
* **Explanation:** The right-hand operand of a shift operator must be greater than or equal to 0 and strictly less than the bit-width of the left operand.
* **Non-compliant Example:**
  ```c
  uint32_t val = 1U;
  uint32_t res = val << 32U; /* Non-compliant: shifting 32-bit int by 32 bits is undefined */
  ```
* **How to Fix:** Ensure shift amounts stay strictly within 0 to (width - 1).
  ```c
  uint32_t res = val << 31U; /* Compliant */
  ```

---

### Rule 12.3 (Advisory)
* **Explanation:** The comma operator `,` should not be used to sequence expressions.
* **Non-compliant Example:**
  ```c
  a = 1, b = 2; /* Non-compliant: comma operator used */
  ```
* **How to Fix:** Split expressions onto separate lines.
  ```c
  a = 1;
  b = 2; /* Compliant */
  ```

---

### Rule 12.4 (Advisory)
* **Explanation:** Evaluation of constant expressions should not lead to unsigned integer wrap-around.
* **Non-compliant Example:**
  ```c
  uint32_t x = 0U - 1U; /* Non-compliant: wrap-around in constant expression */
  ```
* **How to Fix:** Use explicit maximum macros (e.g., `UINT32_MAX`).
  ```c
  uint32_t x = UINT32_MAX; /* Compliant */
  ```

---

## 14. Side Effects & Operations (Section 13)

---

### Rule 13.1 (Required)
* **Explanation:** Initializer lists shall not contain persistent side effects.
* **Non-compliant Example:**
  ```c
  int i = 0;
  int arr[2] = { i++, i++ }; /* Non-compliant: unsequenced side effects in initializer */
  ```
* **How to Fix:** Increment variables outside the initializer list.
  ```c
  int arr[2];
  arr[0] = i;
  i++;
  arr[1] = i;
  i++; /* Compliant */
  ```

---

### Rule 13.2 (Required)
* **Explanation:** Expression evaluation order shall not rely on unsequenced side effects.
* **Non-compliant Example:**
  ```c
  int x = 5;
  int y = x++ + x; /* Non-compliant: undefined evaluation order */
  ```
* **How to Fix:** Separate increments onto separate statements.
  ```c
  int x = 5;
  int y = x + x;
  x++; /* Compliant */
  ```

---

### Rule 13.3 (Advisory)
* **Explanation:** Increment (`++`) and decrement (`--`) operators should not be mixed with other operators in the same expression.
* **Non-compliant Example:**
  ```c
  b = a++ + 5; /* Non-compliant */
  ```
* **How to Fix:** Isolate increment/decrement on their own standalone line.
  ```c
  b = a + 5;
  a++; /* Compliant */
  ```

---

### Rule 13.4 (Advisory)
* **Explanation:** The result of an assignment operator should not be used inside expressions or condition tests.
* **Non-compliant Example:**
  ```c
  if (x = get_val()) { /* Non-compliant: assignment used as condition */ }
  ```
* **How to Fix:** Perform assignment prior to evaluating the condition.
  ```c
  x = get_val();
  if (x != 0) { /* Compliant */ }
  ```

---

### Rule 13.5 (Required)
* **Explanation:** The right-hand side of logical operators (`&&` or `||`) must not contain side effects because short-circuit evaluation makes execution conditional.
* **Non-compliant Example:**
  ```c
  if (flag && (update_counter() > 0)) { /* Non-compliant: update_counter skipped if flag is false */ }
  ```
* **How to Fix:** Evaluate functions with side effects prior to the logical condition.
  ```c
  int status = update_counter();
  if (flag && (status > 0)) { /* Compliant */ }
  ```

---

### Rule 13.6 (Required)
* **Explanation:** The operand of the `sizeof` operator must not contain expressions with side effects, because `sizeof` does not evaluate its operand at runtime.
* **Non-compliant Example:**
  ```c
  size_t s = sizeof(i++); /* Non-compliant: i++ is never executed */
  ```
* **How to Fix:** Pass only types or variables to `sizeof`.
  ```c
  size_t s = sizeof(i); /* Compliant */
  ```

---

## 15. Control Statement Expressions (Section 14)

---

### Rule 14.1 (Required)
* **Explanation:** A loop counter shall not have an essential floating-point type due to accumulation of rounding errors.
* **Non-compliant Example:**
  ```c
  for (float f = 0.0f; f < 1.0f; f += 0.1f) { /* Non-compliant: float loop counter */ }
  ```
* **How to Fix:** Use integer loop counters and calculate float equivalents inside.
  ```c
  for (uint32_t i = 0U; i < 10U; i++) {
      float f = (float)i * 0.1f; /* Compliant */
  }
  ```

---

### Rule 14.2 (Required)
* **Explanation:** A `for` loop shall be well-formed with a single loop counter modified consistently in the loop clause.
* **Non-compliant Example:**
  ```c
  for (int i = 0; i < 10; i++, j--) { /* Non-compliant: modifying multiple loop counters */ }
  ```
* **How to Fix:** Control a single loop variable in the `for` statement header.

---

### Rule 14.3 (Required)
* **Explanation:** Controlling expressions in conditional statements shall not evaluate to invariant constants (always true or always false).
* **Non-compliant Example:**
  ```c
  uint32_t u = 5U;
  if (u >= 0U) { /* Non-compliant: unsigned int is always >= 0 (invariant true) */ }
  ```
* **How to Fix:** Remove redundant conditions.

---

### Rule 14.4 (Required)
* **Explanation:** The controlling expression of an `if`, `while`, or `for` statement must have essential Boolean type (not raw integers or pointers).
* **Non-compliant Example:**
  ```c
  int status = 1;
  if (status) { /* Non-compliant: status is an integer, not boolean */ }
  ```
* **How to Fix:** Use explicit comparison to return a boolean evaluation.
  ```c
  if (status != 0) { /* Compliant */ }
  ```

---

## 16. Control Flow (Section 15)

---

### Rule 15.1 (Advisory)
* **Explanation:** The `goto` statement should not be used.
* **Non-compliant Example:**
  ```c
  void process(void) {
      if (error) goto exit_label; /* Non-compliant */
  exit_label:
      clean_up();
  }
  ```
* **How to Fix:** Refactor using standard control structures (`if`/`else` or helper cleanup functions).

---

### Rule 15.2 (Required)
* **Explanation:** `goto` shall only jump to a label declared later in the same function (no backward jumps).
* **Non-compliant Example:**
  ```c
  back_label:
      do_work();
      if (retry) goto back_label; /* Non-compliant backward jump */
  ```
* **How to Fix:** Use a `while` or `do-while` loop for backward repetition.

---

### Rule 15.3 (Required)
* **Explanation:** Any label referenced by `goto` shall be declared in the same block or an enclosing block.
* **Non-compliant Example:** Jumping inside a nested code block from outside.
* **How to Fix:** Restructure code flow to enter nested blocks normally.

---

### Rule 15.4 (Advisory)
* **Explanation:** There should be no more than one `break` or `goto` statement used to terminate any single loop block.
* **Non-compliant Example:**
  ```c
  for (int i = 0; i < 10; i++) {
      if (cond1) break;
      if (cond2) break; /* Non-compliant: multiple break statements */
  }
  ```
* **How to Fix:** Combine loop termination conditions into the main loop control clause.

---

### Rule 15.5 (Advisory)
* **Explanation:** A function should have a single point of exit at the end of the function.
* **Non-compliant Example:**
  ```c
  int check(int x) {
      if (x < 0) return -1; /* Non-compliant: early return */
      return 1;
  }
  ```
* **How to Fix:** Use a single return variable set during logic processing.
  ```c
  int check(int x) {
      int ret = 1;
      if (x < 0) {
          ret = -1;
      }
      return ret; /* Compliant single exit */
  }
  ```

---

### Rule 15.6 (Required)
* **Explanation:** The body of an `if`, `else`, `while`, `do-while`, or `for` statement shall be a compound statement enclosed in curly braces `{}`.
* **Non-compliant Example:**
  ```c
  if (flag)
      do_something(); /* Non-compliant: missing curly braces */
  ```
* **How to Fix:** Always enclose the body in `{}`.
  ```c
  if (flag) {
      do_something(); /* Compliant */
  }
  ```

---

### Rule 15.7 (Required)
* **Explanation:** All `if ... else if` chains shall be terminated with a final `else` clause (even if empty with a comment).
* **Non-compliant Example:**
  ```c
  if (x == 1) { /* ... */ }
  else if (x == 2) { /* ... */ } /* Non-compliant: missing final else */
  ```
* **How to Fix:** Add a terminating `else` block.
  ```c
  if (x == 1) { /* ... */ }
  else if (x == 2) { /* ... */ }
  else { /* Default safe fallback */ } /* Compliant */
  ```

---

## 17. Switch Statements (Section 16)

---

### Rule 16.1 (Required)
* **Explanation:** All `switch` statements shall be well-formed syntax blocks.
* **Non-compliant Example:** Misplaced labels or switch cases outside block scope.

---

### Rule 16.2 (Required)
* **Explanation:** A `switch` label shall only be used when directly enclosed in the outermost body of a `switch` statement (Duff's Device is forbidden).
* **Non-compliant Example:**
  ```c
  switch (mark) {
      if (cond) {
          case 1: break; /* Non-compliant: case inside nested if */
      }
  }
  ```
* **How to Fix:** Place `case` labels cleanly at top level of `switch`.

---

### Rule 16.3 (Required)
* **Explanation:** An unconditional `break` statement shall terminate every non-empty `case` clause (no implicit fall-through).
* **Non-compliant Example:**
  ```c
  switch (val) {
      case 1:
          do_a(); /* Non-compliant: falls through into case 2 */
      case 2:
          do_b();
          break;
  }
  ```
* **How to Fix:** Add `break;` at the end of every non-empty `case`.
  ```c
  switch (val) {
      case 1:
          do_a();
          break; /* Compliant */
      case 2:
          do_b();
          break;
  }
  ```

---

### Rule 16.4 (Required)
* **Explanation:** Every `switch` statement shall contain an explicit `default` clause.
* **Non-compliant Example:**
  ```c
  switch (val) {
      case 1: process(); break; /* Non-compliant: missing default */
  }
  ```
* **How to Fix:** Add a `default` case to handle unexpected inputs.
  ```c
  switch (val) {
      case 1: process(); break;
      default: handle_error(); break; /* Compliant */
  }
  ```

---

### Rule 16.5 (Required)
* **Explanation:** The `default` clause shall appear as either the first or last clause in a `switch` statement.
* **Non-compliant Example:** Placing `default:` between `case 1:` and `case 2:`.
* **How to Fix:** Move `default:` to the very end of the `switch` block.

---

### Rule 16.6 (Required)
* **Explanation:** Every `switch` statement shall contain at least two `case` clauses.
* **Non-compliant Example:**
  ```c
  switch (val) {
      case 1: process(); break;
      default: break; /* Non-compliant: only one case clause */
  }
  ```
* **How to Fix:** Use an `if` statement for single-condition tests.

---

### Rule 16.7 (Required)
* **Explanation:** The controlling expression of a `switch` statement shall not have essential Boolean type.
* **Non-compliant Example:**
  ```c
  switch (x == 5) { /* Non-compliant: boolean expression in switch */ }
  ```
* **How to Fix:** Use an `if-else` statement for boolean conditions.

---

## 18. Functions (Section 17)

---

### Rule 17.1 (Required)
* **Explanation:** Variable length argument features from `<stdarg.h>` (`va_list`, `va_arg`, `va_start`) shall not be used due to lack of type safety.
* **Non-compliant Example:**
  ```c
  void log_err(const char *fmt, ...) { /* Non-compliant */ }
  ```
* **How to Fix:** Pass explicit typed arrays or structured parameters.

---

### Rule 17.2 (Required)
* **Explanation:** Functions shall not call themselves directly or indirectly (no recursion) to guarantee bounded stack memory usage.
* **Non-compliant Example:**
  ```c
  uint32_t factorial(uint32_t n) {
      return (n <= 1U) ? 1U : (n * factorial(n - 1U)); /* Non-compliant recursion */
  }
  ```
* **How to Fix:** Rewrite using iterative loops.
  ```c
  uint32_t factorial(uint32_t n) {
      uint32_t res = 1U;
      for (uint32_t i = 1U; i <= n; i++) {
          res *= i;
      }
      return res; /* Compliant iterative implementation */
  }
  ```

---

### Rule 17.3 (Mandatory)
* **Explanation:** Functions shall not be declared implicitly. Prototype headers must be included before invocation.
* **Non-compliant Example:**
  ```c
  void test(void) {
      compute(); /* Non-compliant if compute() prototype is missing */
  }
  ```
* **How to Fix:** Declare function prototype before use.

---

### Rule 17.4 (Mandatory)
* **Explanation:** All exit paths from a function returning a non-void value shall return an explicit expression.
* **Non-compliant Example:**
  ```c
  int val(int x) {
      if (x > 0) return 1;
      /* Non-compliant: falls off end without return expression */
  }
  ```
* **How to Fix:** Ensure all paths return a value.
  ```c
  int val(int x) {
      int res = -1;
      if (x > 0) { res = 1; }
      return res; /* Compliant */
  }
  ```

---

### Rule 17.5 (Advisory)
* **Explanation:** Function argument declarations using array notation should match expected array dimensions.
* **Non-compliant Example:** Passing a 2-element array to a parameter declared `int arr[10]`.
* **How to Fix:** Ensure caller array allocations match parameter boundary specs.

---

### Rule 17.6 (Mandatory)
* **Explanation:** The `static` keyword inside array parameter declarations (`void fn(int arr[static 10])`) shall not be used.
* **Non-compliant Example:** `void fn(int arr[static 5]);`
* **How to Fix:** Use standard pointer or fixed-size array notation without `static`.

---

### Rule 17.7 (Required)
* **Explanation:** The value returned by a function having a non-void return type shall be used or explicitly cast to `(void)`.
* **Non-compliant Example:**
  ```c
  calculate_data(); /* Non-compliant: return value ignored */
  ```
* **How to Fix:** Cast ignored return values explicitly to `(void)`.
  ```c
  (void)calculate_data(); /* Compliant */
  ```

---

### Rule 17.8 (Advisory)
* **Explanation:** Function parameters should not be modified within the function body (treat parameters as read-only inputs).
* **Non-compliant Example:**
  ```c
  void process(int val) {
      val++; /* Non-compliant: parameter mutated */
  }
  ```
* **How to Fix:** Copy parameter to a local stack variable.
  ```c
  void process(int val) {
      int local_val = val;
      local_val++; /* Compliant */
  }
  ```

---

## 19. Pointers & Arrays (Section 18)

---

### Rule 18.1 (Required)
* **Explanation:** Pointer arithmetic shall stay strictly within array bounds.
* **Non-compliant Example:**
  ```c
  int arr[5];
  int *p = &arr[10]; /* Non-compliant: out of bounds */
  ```
* **How to Fix:** Keep pointer indices within bounds `[0 ... SIZE-1]`.

---

### Rule 18.2 (Required)
* **Explanation:** Subtraction between pointers shall only be applied when both point to elements within the same array.
* **Non-compliant Example:**
  ```c
  int a[5];
  int b[5];
  ptrdiff_t diff = &a[2] - &b[2]; /* Non-compliant: pointers to different objects */
  ```
* **How to Fix:** Subtract pointers only within shared array structures.

---

### Rule 18.3 (Required)
* **Explanation:** Relational operators (`<`, `<=`, `>`, `>=`) shall not be applied to pointers pointing to different memory objects.
* **Non-compliant Example:**
  ```c
  if (&a[0] < &b[0]) { /* Non-compliant: comparing addresses of distinct objects */ }
  ```
* **How to Fix:** Perform relational comparisons only on pointers within the same array.

---

### Rule 18.4 (Advisory)
* **Explanation:** Pointer arithmetic (`+`, `-`, `+=`, `-=`) should not be used. Array indexing `[]` should be used instead.
* **Non-compliant Example:**
  ```c
  int *p = arr;
  *(p + 2) = 10; /* Non-compliant pointer arithmetic */
  ```
* **How to Fix:** Use array subscript notation.
  ```c
  arr[2] = 10; /* Compliant */
  ```

---

### Rule 18.5 (Advisory)
* **Explanation:** Declarations should not contain more than two levels of pointer indirection (avoid `***p`).
* **Non-compliant Example:**
  ```c
  int ***triple_ptr; /* Non-compliant */
  ```
* **How to Fix:** Simplify data models or wrap pointers in structures.

---

### Rule 18.6 (Required)
* **Explanation:** The address of an automatic storage object shall not be assigned to an object that outlives the function return.
* **Non-compliant Example:**
  ```c
  int *global_ptr;

  void setup(void) {
      int local_val = 10;
      global_ptr = &local_val; /* Non-compliant: dangling pointer when setup returns */
  }
  ```
* **How to Fix:** Assign addresses of static or global variables only.

---

### Rule 18.7 (Required)
* **Explanation:** Flexible array members (`struct { int n; int arr[]; }`) shall not be declared.
* **Non-compliant Example:** Declaring unbounded dynamic structures.
* **How to Fix:** Declare array fields with explicit maximum sizes.

---

### Rule 18.8 (Required)
* **Explanation:** Variable-length array (VLA) types shall not be used because stack sizing cannot be determined at compile time.
* **Non-compliant Example:**
  ```c
  void process(int n) {
      int buf[n]; /* Non-compliant: VLA */
  }
  ```
* **How to Fix:** Use compile-time constant array dimensions.
  ```c
  #define MAX_BUF (64U)
  void process(int n) {
      int buf[MAX_BUF]; /* Compliant */
  }
  ```

---

## 20. Overlapping Storage / Unions (Section 19)

---

### Rule 19.1 (Mandatory)
* **Explanation:** Memory objects shall not be copied or assigned to overlapping objects (e.g., using `memcpy` on overlapping regions).
* **Non-compliant Example:**
  ```c
  char buf[20] = "Hello World";
  memcpy(&buf[2], &buf[0], 5); /* Non-compliant: overlapping memory */
  ```
* **How to Fix:** Use `memmove` for overlapping memory regions.
  ```c
  (void)memmove(&buf[2], &buf[0], 5); /* Compliant */
  ```

---

### Rule 19.2 (Advisory)
* **Explanation:** The `union` keyword should not be used, as it allows type punning and unintended bit reinterpretation.
* **Non-compliant Example:**
  ```c
  union Data { int i; float f; }; /* Non-compliant */
  ```
* **How to Fix:** Use explicit structure containers with type flags.

---

## 21. Preprocessing Directives (Section 20)

---

### Rule 20.1 (Advisory)
* **Explanation:** `#include` directives should only be preceded by preprocessor directives or comments (not C statements).
* **Non-compliant Example:**
  ```c
  int x = 0;
  #include "header.h" /* Non-compliant: include after code */
  ```
* **How to Fix:** Place all `#include` lines at top of file.

---

### Rule 20.2 (Required)
* **Explanation:** Characters `'`, `"`, `\`, or `/*` shall not occur in `#include` header names.
* **Non-compliant Example:** `#include "dir\file.h"`
* **How to Fix:** Use forward slashes `/` in paths: `#include "dir/file.h"`

---

### Rule 20.3 (Required)
* **Explanation:** `#include` directives shall be followed by `<filename>` or `"filename"`.
* **Non-compliant Example:** `#include file.h`
* **How to Fix:** Use double quotes or angle brackets.

---

### Rule 20.4 (Required)
* **Explanation:** Macro names shall not shadow C language keywords.
* **Non-compliant Example:** `#define int long`
* **How to Fix:** Do not redefine standard C keywords.

---

### Rule 20.5 (Advisory)
* **Explanation:** `#undef` should not be used to undefine macros.
* **Non-compliant Example:** `#undef MAX_SIZE`
* **How to Fix:** Use unique macro names instead of undefining.

---

### Rule 20.6 (Required)
* **Explanation:** Macro arguments shall not expand into preprocessor directives.
* **Non-compliant Example:** Passing `#define X 1` inside a macro call.
* **How to Fix:** Keep macro arguments restricted to pure expressions.

---

### Rule 20.7 (Required)
* **Explanation:** Every parameter expanded within a macro definition shall be enclosed in parentheses.
* **Non-compliant Example:**
  ```c
  #define MULT(a, b) (a * b) /* Non-compliant */
  ```
* **How to Fix:** Parenthesize parameters.
  ```c
  #define MULT(a, b) ((a) * (b)) /* Compliant */
  ```

---

### Rule 20.8 (Required)
* **Explanation:** Controlling expressions of `#if` or `#elif` shall evaluate to 0 or 1.
* **Non-compliant Example:** `#if (5 + 2)`
* **How to Fix:** Compare explicitly against values: `#if ((5 + 2) == 7)`

---

### Rule 20.9 (Required)
* **Explanation:** All identifiers used in `#if` or `#elif` expressions shall be defined before evaluation.
* **Non-compliant Example:** `#if UNDEFINED_MACRO`
* **How to Fix:** Use `defined()` checks first: `#if defined(FEATURE_X) && (FEATURE_X == 1)`

---

### Rule 20.10 (Advisory)
* **Explanation:** The `#` (stringification) and `##` (token pasting) preprocessor operators should not be used.
* **Non-compliant Example:** `#define MAKE_VAR(name) var_##name`
* **How to Fix:** Declare variables explicitly without macro concatenation.

---

### Rule 20.11 (Required)
* **Explanation:** The `##` operator shall not be used unless the preceding macro parameter is evaluated.

---

### Rule 20.12 (Required)
* **Explanation:** A macro parameter used with `#` or `##` shall not be expanded elsewhere in the same macro.

---

### Rule 20.13 (Required)
* **Explanation:** Preprocessor lines must form valid directives.

---

### Rule 20.14 (Required)
* **Explanation:** All `#if`, `#ifdef`, `#ifndef` directives must be terminated with `#endif` in the same file.
* **Non-compliant Example:** Header file missing `#endif` at end of file.
* **How to Fix:** Ensure balanced conditional preprocessor directives in every file.

---

## 22. Standard Libraries (Section 21)

---

### Rule 21.1 (Required)
* **Explanation:** `#define` and `#undef` shall not be used on standard library reserved identifiers or macros.
* **Non-compliant Example:** `#define NULL (0)`
* **How to Fix:** Include `<stddef.h>` for `NULL`.

---

### Rule 21.2 (Required)
* **Explanation:** Reserved identifiers (such as names starting with `_` or `__`) shall not be declared for user functions/objects.
* **Non-compliant Example:** `int _my_var = 0;`
* **How to Fix:** Remove leading underscores from identifier names.

---

### Rule 21.3 (Required)
* **Explanation:** `<stdlib.h>` dynamic memory functions (`malloc`, `calloc`, `realloc`, `free`) shall not be used.
* **Non-compliant Example:** `int *p = malloc(sizeof(int));`
* **How to Fix:** Use static object declarations.

---

### Rule 21.4 (Required)
* **Explanation:** Standard header `<setjmp.h>` and functions `setjmp`/`longjmp` shall not be used due to uncontrolled control flow jumps.

---

### Rule 21.5 (Required)
* **Explanation:** Standard header `<signal.h>` and asynchronous signal handling features shall not be used.

---

### Rule 21.6 (Required)
* **Explanation:** Standard library I/O functions (`<stdio.h>`) shall not be used in embedded safety-critical software.
* **Non-compliant Example:** `printf("Value: %d\n", val);`
* **How to Fix:** Direct diagnostic output to dedicated hardware UART drivers or log buffers.

---

### Rule 21.7 (Required)
* **Explanation:** String conversion functions (`atof`, `atoi`, `atol`, `atoll`) from `<stdlib.h>` shall not be used due to unbounded behavior on invalid inputs.
* **Non-compliant Example:** `int val = atoi(str);`
* **How to Fix:** Use `strtol()` with range verification or custom bounded parsers.

---

### Rule 21.8 (Required)
* **Explanation:** System termination functions (`abort`, `exit`, `getenv`, `system`) from `<stdlib.h>` shall not be used.
* **Non-compliant Example:** `exit(1);`
* **How to Fix:** Implement system safe-state recovery logic.

---

### Rule 21.9 (Required)
* **Explanation:** `bsearch` and `qsort` from `<stdlib.h>` shall not be used due to unverified function pointer callbacks and potential stack overhead.
* **Non-compliant Example:** Calling `qsort()` on an array.
* **How to Fix:** Implement explicit, statically bounded sorting algorithms (e.g., insertion sort).

---

### Rule 21.10 (Required)
* **Explanation:** Standard header `<time.h>` date and time functions shall not be used.

---

### Rule 21.11 (Required)
* **Explanation:** Standard header `<tgmath.h>` type-generic math library shall not be used.

---

### Rule 21.12 (Advisory)
* **Explanation:** Standard header `<fenv.h>` floating-point exception handling should not be used.

---

## 23. Resources & Environment (Section 22)

---

### Rule 22.1 (Required)
* **Explanation:** All resources allocated dynamically (such as file handles or hardware locks) must be explicitly released on all path exits.
* **Non-compliant Example:** Returning from a function without closing an opened file handle.
* **How to Fix:** Ensure resource handles are explicitly released prior to every return path.

---

### Rule 22.2 (Mandatory)
* **Explanation:** A resource shall not be released more than once (e.g., double-free or double-closing a handle).
* **Non-compliant Example:**
  ```c
  fclose(fp);
  fclose(fp); /* Non-compliant: double release */
  ```
* **How to Fix:** Set resource handle to `NULL` after release and check before closing.

---

### Rule 22.3 (Required)
* **Explanation:** The same file shall not be opened simultaneously for read and write on different streams.

---

### Rule 22.4 (Required)
* **Explanation:** A read-only stream shall not be written to, and a write-only stream shall not be read from.

---

### Rule 22.5 (Mandatory)
* **Explanation:** Pointers to `FILE` objects shall not be dereferenced directly.

---

### Rule 22.6 (Required)
* **Explanation:** The value of a pointer to a closed `FILE` stream shall not be used.