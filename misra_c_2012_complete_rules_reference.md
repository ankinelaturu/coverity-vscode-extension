# MISRA C:2012 Guidelines Reference Manual (with Code Examples & Fixes)

This document provides a comprehensive listing of **MISRA C:2012** Directives and Rules as defined by the Motor Industry Software Reliability Association (MISRA). Each entry includes a description, a separate Fix note, and a side-by-side Example | Fixed code comparison.

---

## 1. Directives (Process, Environment, & Architecture)

Directives are guidelines where compliance cannot be determined by static analysis of source code alone. They require system documentation, architectural design, process checks, or compiler specifications.

---

### Dir 1.1 (Required)

Any implementation-defined behavior (such as endianness, integer representation, or bit-field ordering) on which the program depends must be documented and understood by the team.

**Fix:** Document compiler/hardware requirements in your project architecture documentation, or isolate byte operations using bitwise shifts.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
/* Dependent on architecture byte order (endianness) without documentation */
uint32_t val = 0x12345678U;
uint8_t first_byte = *(uint8_t *)&val; 
```

</td>
<td valign="top">

```c
/* Compliant: Portable shift operation independent of endianness */
uint32_t val = 0x12345678U;
uint8_t first_byte = (uint8_t)(val & 0xFFU);
```

</td>
</tr>
</tbody>
</table>

---

### Dir 2.1 (Required)

All source files in the system must compile cleanly without any errors or warnings under the target compiler set with strict diagnostics enabled.

**Fix:** Ensure all files build with zero syntax, structural, or language constraint errors across all target build configurations.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int process(void) {
    int x = 10 // Non-compliant: missing semicolon causes compilation error
    return x;
}
```

</td>
<td valign="top">

```c
int process(void) {
    int x = 10; /* Compliant: valid syntax, compiles cleanly */
    return x;
}
```

</td>
</tr>
</tbody>
</table>

---

### Dir 3.1 (Required)

All source code must be traceable back to documented requirements (software safety requirements, functional requirements, or system specifications).

**Fix:** Annotate functions with requirement traceability tags linking directly to system design documentation.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
/* Undocumented secret backdoor or dead debugging logic in production build */
void secret_debug_mode(void) {
    system_override = true;
}
```

</td>
<td valign="top">

```c
/* Compliant: Traceable to Software Safety Requirement SSR-FAIL-042 */
void enter_safe_state(void) {
    actuator_disable();
}
```

</td>
</tr>
</tbody>
</table>

---

### Dir 4.1 (Required)

Code must be designed to minimize run-time failures, including arithmetic overflow, divide-by-zero, pointer dereferencing errors, and buffer overruns.

**Fix:** Add defensive checks prior to operations that could result in runtime exceptions.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int divide_values(int a, int b) {
    return a / b; /* Non-compliant: susceptible to division by zero if b == 0 */
}
```

</td>
<td valign="top">

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

</td>
</tr>
</tbody>
</table>

---

### Dir 4.2 (Advisory)

All usage of assembly language must be explicitly documented to specify register usage, side effects, and memory boundaries.

**Fix:** Document the assembly instructions and encapsulate them inside documented wrapper functions.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void reset_cpu(void) {
    __asm__("NOP"); /* Undocumented inline assembly */
}
```

</td>
<td valign="top">

```c
/**
 * @brief Executes a hardware NOP operation for timing alignment.
 * Target: ARM Cortex-M4
 */
void reset_cpu(void) {
    __asm__ volatile ("nop");
}
```

</td>
</tr>
</tbody>
</table>

---

### Dir 4.3 (Required)

Assembly language instructions must be encapsulated inside standalone functions or macros and isolated from C logic.

**Fix:** Encapsulate assembly commands inside single-purpose helper functions.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int compute_and_disable_interrupts(int a, int b) {
    int res = a + b;
    __asm__("cpsid i"); /* Non-compliant: assembly mixed in C business logic */
    return res;
}
```

</td>
<td valign="top">

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

</td>
</tr>
</tbody>
</table>

---

### Dir 4.4 (Advisory)

Sections of code should not be disabled by placing them inside comments. Use preprocessor conditional compilation or remove unused code entirely.

**Fix:** Remove commented-out code blocks or use `#if 0` with explicit explanations if temporary exclusion is needed.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void update_sensor(void) {
    /* 
    read_old_sensor();
    calibrate_old(); 
    */
    read_new_sensor();
}
```

</td>
<td valign="top">

```c
void update_sensor(void) {
    read_new_sensor(); /* Compliant: old code removed from source */
}
```

</td>
</tr>
</tbody>
</table>

---

### Dir 4.5 (Advisory)

Identifiers in the same namespace with overlapping visibility should be typographically unambiguous (avoid relying on combinations of `1`/`l`/`I` or `O`/`0`).

**Fix:** Choose distinct, clear identifier names.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int total_l1_value;
int total_I1_value; /* Non-compliant: l1 and I1 are visually ambiguous */
```

</td>
<td valign="top">

```c
int total_level1_value;
int total_index1_value; /* Compliant: clear and distinct names */
```

</td>
</tr>
</tbody>
</table>

---

### Dir 4.6 (Advisory)

Standard basic numeric types (`int`, `short`, `long`, `char`) should not be used directly. Explicit typedefs indicating size and signedness (e.g., `uint32_t`, `int16_t` from `<stdint.h>`) should be used instead.

**Fix:** Use standard exact-width integer types.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
unsigned long counter; /* Non-compliant: width varies between platforms */
```

</td>
<td valign="top">

```c
uint32_t counter; /* Compliant: explicit width and signedness */
```

</td>
</tr>
</tbody>
</table>

---

### Dir 4.7 (Required)

If a function returns error information, that error status must be explicitly tested by the caller.

**Fix:** Store and check return values from functions that report status.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void process_file(void) {
    fclose(fp); /* Non-compliant: error return status ignored */
}
```

</td>
<td valign="top">

```c
void process_file(void) {
    if (fclose(fp) != 0) {
        handle_file_error();
    }
}
```

</td>
</tr>
</tbody>
</table>

---

### Dir 4.8 (Advisory)

If a pointer to a `struct` or `union` is never dereferenced within a translation unit, the internal layout of the structure should be hidden (opaque pointer design pattern).

**Fix:** Forward-declare the structure in the header and define its members only in the implementation file.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
/* header.h exposed to all callers even though internal fields are unused */
struct DeviceHandle {
    uint32_t reg_base;
    uint8_t buffer[256];
};
```

</td>
<td valign="top">

```c
/* public_header.h */
struct DeviceHandle; /* Forward declaration (opaque handle) */

/* private_impl.c */
struct DeviceHandle {
    uint32_t reg_base;
    uint8_t buffer[256];
};
```

</td>
</tr>
</tbody>
</table>

---

### Dir 4.9 (Advisory)

A inline function should be used in preference to a function-like macro where they are interchangeable to ensure type checking and prevent double-evaluation bugs.

**Fix:** Replace function-like macros with type-safe inline functions.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#define MAX(a, b) (((a) > (b)) ? (a) : (b)) /* Non-compliant: macro risk */
```

</td>
<td valign="top">

```c
static inline int32_t max_int32(int32_t a, int32_t b) {
    return (a > b) ? a : b;
}
```

</td>
</tr>
</tbody>
</table>

---

### Dir 4.10 (Required)

Header files must be protected against multiple inclusion using include guards or `#pragma once`.

**Fix:** Wrap the entire header contents in `#ifndef`, `#define`, and `#endif`.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
/* my_header.h with no include guard */
void calculate(void);
```

</td>
<td valign="top">

```c
#ifndef MY_HEADER_H
#define MY_HEADER_H

void calculate(void);

#endif /* MY_HEADER_H */
```

</td>
</tr>
</tbody>
</table>

---

### Dir 4.11 (Required)

Parameters passed to standard library functions must be validated before calling to prevent undefined behavior.

**Fix:** Check boundary conditions and parameter ranges prior to library function invocations.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void print_sub(const char *str) {
    char buf[10];
    memcpy(buf, str, 100); /* Non-compliant: no size check on source string */
}
```

</td>
<td valign="top">

```c
void print_sub(const char *str) {
    char buf[10];
    if ((str != NULL) && (strlen(str) < sizeof(buf))) {
        (void)memcpy(buf, str, strlen(str) + 1U);
    }
}
```

</td>
</tr>
</tbody>
</table>

---

### Dir 4.12 (Required)

Dynamic memory allocation (`malloc`, `calloc`, `realloc`, `free`) shall not be used in embedded safety-critical software due to risk of heap fragmentation, memory leaks, and non-deterministic run times.

**Fix:** Allocate memory statically at compile time.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
uint8_t *buffer = (uint8_t *)malloc(1024); /* Non-compliant */
```

</td>
<td valign="top">

```c
static uint8_t buffer[1024]; /* Compliant: static allocation */
```

</td>
</tr>
</tbody>
</table>

---

### Dir 4.13 (Advisory)

Functions designed to operate on a shared resource (such as lock/unlock or open/close) should be called in a paired, appropriate sequence.

**Fix:** Ensure resources are explicitly cleaned up before returning.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void write_data(void) {
    lock_mutex();
    if (check_condition() == false) {
        return; /* Non-compliant: mutex remains locked when returning early */
    }
    unlock_mutex();
}
```

</td>
<td valign="top">

```c
void write_data(void) {
    lock_mutex();
    if (check_condition() == true) {
        perform_write();
    }
    unlock_mutex(); /* Compliant: mutex released on all execution paths */
}
```

</td>
</tr>
</tbody>
</table>

---

### Dir 4.14 (Required)

The validity of values received from external interfaces (CAN bus, UART, ADC, shared memory) must be validated before processing.

**Fix:** Validate all input boundaries against permissible ranges.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void process_adc_raw(uint16_t adc_val) {
    /* Non-compliant: raw input used directly as array index without check */
    sensor_table[adc_val] = 1; 
}
```

</td>
<td valign="top">

```c
#define MAX_SENSOR_ENTRIES (100U)

void process_adc_raw(uint16_t adc_val) {
    if (adc_val < MAX_SENSOR_ENTRIES) {
        sensor_table[adc_val] = 1;
    }
}
```

</td>
</tr>
</tbody>
</table>

---

## 2. Standard C Environment (Section 1)

---

### Rule 1.1 (Required)

Programs must strictly adhere to ISO C language standards without violating syntax limits or compiler constraints.

**Fix:** Restructure complex nested code blocks to adhere to ISO C bounds and clean syntax.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
/* Exceeding compiler max nesting levels or invalid standard syntax */
void nested(void) { {{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{ int x = 0; }}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
```

</td>
<td valign="top">

```c
static void inner(void) {
    int x = 0;
    (void)x;
}

void nested(void) {
    inner(); /* Compliant: nesting kept within ISO C translation limits */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 1.2 (Advisory)

Non-standard compiler extensions (such as inline GNU assembly syntax extensions or custom keywords) should not be used unless wrapped and documented.

**Fix:** Use Standard C operators.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
typeof(a) b = a; /* Non-compliant: GNU extension 'typeof' */
```

</td>
<td valign="top">

```c
uint32_t b = a; /* Compliant: Standard C type declaration */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 1.3 (Mandatory)

Code shall contain no occurrences of undefined behavior (e.g., dereferencing NULL pointers, shifting by negative offsets) or critical unspecified behavior.

**Fix:** Guard pointers against `NULL` prior to dereferencing.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int *ptr = NULL;
*ptr = 42; /* Non-compliant: Undefined behavior (dereferencing NULL) */
```

</td>
<td valign="top">

```c
int val = 0;
int *ptr = &val;
if (ptr != NULL) {
    *ptr = 42; /* Compliant */
}
```

</td>
</tr>
</tbody>
</table>

---

## 3. Unused Code (Section 2)

---

### Rule 2.1 (Required)

Code must not contain unreachable logic (statements that can never be executed under any path).

**Fix:** Delete unreachable statements.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int compute(void) {
    return 10;
    int y = 20; /* Non-compliant: unreachable statement */
}
```

</td>
<td valign="top">

```c
int compute(void) {
    return 10; /* Compliant */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 2.2 (Required)

Projects shall not contain dead code (statements whose execution produces no effect on outputs or program state).

**Fix:** Remove operations that produce no side effect.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void calculate(void) {
    int x = 5;
    x + 10; /* Non-compliant: evaluated value is discarded */
}
```

</td>
<td valign="top">

```c
void calculate(void) {
    int x = 5;
    x = x + 10; /* Compliant: result used */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 2.3 (Advisory)

Types defined via `typedef` should be removed if they are not used anywhere in the project.

**Fix:** Remove unused `typedef` declarations from headers and source files.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
typedef uint32_t UnusedType; /* Non-compliant if never used */
typedef uint16_t Speed_t;
Speed_t speed = 0U;
```

</td>
<td valign="top">

```c
typedef uint16_t Speed_t; /* Compliant: typedef is used */
Speed_t speed = 0U;
```

</td>
</tr>
</tbody>
</table>

---

### Rule 2.4 (Advisory)

`struct`, `union`, or `enum` tag declarations that are never instantiated or referenced should be removed.

**Fix:** Delete unused tag definitions.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
enum UnusedTag { ALPHA, BETA }; /* Non-compliant if tag is unused */
enum Color { RED, GREEN, BLUE };
enum Color c = RED;
```

</td>
<td valign="top">

```c
enum Color { RED, GREEN, BLUE }; /* Compliant: tag is referenced */
enum Color c = RED;
```

</td>
</tr>
</tbody>
</table>

---

### Rule 2.5 (Advisory)

Macro definitions (`#define`) that are never expanded within the project should be removed.

**Fix:** Remove unused macro definitions.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#define UNUSED_TIMEOUT (500U) /* Non-compliant if unused */
#define RETRY_COUNT (3U)
uint32_t retries = RETRY_COUNT;
```

</td>
<td valign="top">

```c
#define RETRY_COUNT (3U) /* Compliant: macro is expanded */
uint32_t retries = RETRY_COUNT;
```

</td>
</tr>
</tbody>
</table>

---

### Rule 2.6 (Advisory)

Label declarations for `goto` targets should not exist if they are never jumped to.

**Fix:** Delete unused labels.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void test(void) {
unused_label: /* Non-compliant: label is never referenced */
    return;
}
```

</td>
<td valign="top">

```c
void test(void) {
    return; /* Compliant: unused label removed */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 2.7 (Advisory)

Parameters defined in a function signature should be used inside the body, or marked/documented if mandated by an interface callback.

**Fix:** Remove unused parameters, or cast them to `(void)` to document intent.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void handle_event(int event_id, int unused_arg) {
    process_event(event_id); /* Non-compliant: unused_arg never read */
}
```

</td>
<td valign="top">

```c
void handle_event(int event_id, int unused_arg) {
    (void)unused_arg; /* Compliant: explicitly cast to void */
    process_event(event_id);
}
```

</td>
</tr>
</tbody>
</table>

---

## 4. Comments (Section 3)

---

### Rule 3.1 (Required)

Nested comment character sequences (`/*` or `//`) must not be placed inside existing comments, as this leads to unintended code activation/deactivation.

**Fix:** Avoid nesting comment tokens within comments.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
/* Comment starts here 
   /* Nested comment */
   x = y; /* This line is accidentally inside the outer comment! */
*/
```

</td>
<td valign="top">

```c
/* Outer comment block describing function logic */
x = y;
```

</td>
</tr>
</tbody>
</table>

---

### Rule 3.2 (Required)

Line-splicing (ending a line with `\`) must not be used at the end of C++ style `//` comments, because it will cause the next code line to be treated as part of the comment.

**Fix:** Remove trailing backslashes from single-line comments.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
// This is a comment line \
execute_critical_safety_routine(); /* Non-compliant: hidden by line splicing! */
```

</td>
<td valign="top">

```c
// This is a clean comment line
execute_critical_safety_routine(); /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

## 5. Character Sets & Lexical Conventions (Section 4)

---

### Rule 4.1 (Required)

Octal and hexadecimal escape sequences in strings must be explicitly terminated (using string concatenation or fixed length) to prevent adjacent characters from being misinterpreted as part of the escape sequence.

**Fix:** Break up string literals to terminate the escape sequence.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
const char *str = "\x12345"; /* Non-compliant: '345' treated as part of hex escape */
```

</td>
<td valign="top">

```c
const char *str = "\x12" "345"; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 4.2 (Advisory)

Trigraphs (such as `??=` for `#`) should not be used, as they reduce readability and can cause accidental token substitution.

**Fix:** Use standard ASCII preprocessor and operator symbols.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
/* Non-compliant: Trigraph for '#' */
??=define MAX 100 
```

</td>
<td valign="top">

```c
#define MAX 100 /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

## 6. Identifiers & Scope (Section 5)

---

### Rule 5.1 (Required)

External identifiers must be distinct in their first 31 characters to avoid linker collisions on legacy toolchains.

**Fix:** Keep external identifiers distinct within the first 31 characters.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int engine_management_system_parameter_alpha;
int engine_management_system_parameter_beta; /* Non-compliant if toolchain truncates at 31 chars */
```

</td>
<td valign="top">

```c
int ems_param_alpha;
int ems_param_beta; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 5.2 (Required)

Identifiers declared within the same scope and namespace must be unique.

**Fix:** Ensure distinct variable names within a scope.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void process(void) {
    int count = 0;
    int count = 1; /* Non-compliant: duplicate identifier */
}
```

</td>
<td valign="top">

```c
void process(void) {
    int input_count = 0;
    int output_count = 1; /* Compliant: unique identifiers */
    (void)input_count;
    (void)output_count;
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 5.3 (Required)

An identifier declared in an inner scope must not hide an identifier declared in an outer scope.

**Fix:** Rename the inner variable to prevent scope shadowing.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int global_val = 100;

void update(void) {
    int global_val = 50; /* Non-compliant: inner variable shadows outer global */
}
```

</td>
<td valign="top">

```c
int global_val = 100;

void update(void) {
    int local_val = 50; /* Compliant */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 5.4 (Required)

Macro identifiers must be distinct from other macro identifiers.

**Fix:** Use distinct macro names.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#define SENSOR_READING_MAX_LIMIT (100U)
#define SENSOR_READING_MAX_LIMIT (200U) /* Non-compliant: duplicate macro definition */
```

</td>
<td valign="top">

```c
#define SENSOR_READING_SOFT_LIMIT (100U)
#define SENSOR_READING_HARD_LIMIT (200U) /* Compliant: distinct macro names */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 5.5 (Required)

Identifiers shall be distinct from macro names in the same translation unit.

**Fix:** Distinguish variable names from macro names using naming conventions (e.g., ALL_CAPS for macros).

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#define STATUS_OK (0U)
int STATUS_OK = 0; /* Non-compliant: identifier collides with macro name */
```

</td>
<td valign="top">

```c
#define STATUS_OK (0U)
int status_ok = (int)STATUS_OK; /* Compliant: identifier does not collide with macro */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 5.6 (Required)

A `typedef` name shall be a unique identifier across the project.

**Fix:** Avoid redefining existing `typedef` identifiers.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
typedef uint32_t speed_t;
typedef uint16_t speed_t; /* Non-compliant: duplicate typedef name */
```

</td>
<td valign="top">

```c
typedef uint32_t speed_t;
typedef uint16_t rpm_t; /* Compliant: unique typedef names */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 5.7 (Required)

Tag names for `struct`, `union`, or `enum` must be unique identifiers across the project.

**Fix:** Use distinct tag names for separate data structures.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
struct Node { int data; };
union Node { int data_int; float data_flt; }; /* Non-compliant: duplicate tag 'Node' */
```

</td>
<td valign="top">

```c
struct Node { int data; };
union NodeData { int data_int; float data_flt; }; /* Compliant: unique tags */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 5.8 (Required)

External linkage objects or functions must have globally unique identifiers.

**Fix:** Rename variables or apply `static` storage specifiers if linkage is internal to a single file.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
/* file1.c */ int status = 0;
/* file2.c */ int status = 1; /* Non-compliant: global identifier collision */
```

</td>
<td valign="top">

```c
/* file1.c */
static int file1_status = 0; /* Compliant: internal linkage */

/* file2.c */
static int file2_status = 1; /* Compliant: no external collision */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 5.9 (Advisory)

Identifiers defining objects or functions with internal linkage should be unique across translation units to simplify debugging.

**Fix:** Give file-scope static variables distinct, module-prefixed names.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
/* file1.c */ static int counter = 0;
/* file2.c */ static int counter = 0; /* Non-compliant: identical internal names */
```

</td>
<td valign="top">

```c
/* file1.c */ static int f1_counter = 0;
/* file2.c */ static int f2_counter = 0; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

## 7. Types (Section 6)

---

### Rule 6.1 (Required)

Bit-fields shall only be declared with explicitly `signed int` or `unsigned int` types (or `bool`). Generic `int` is implementation-defined regarding signedness.

**Fix:** Explicitly state signedness.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
struct Flags {
    int flag1 : 1; /* Non-compliant: plain 'int' signedness is compiler-dependent */
};
```

</td>
<td valign="top">

```c
struct Flags {
    unsigned int flag1 : 1; /* Compliant */
};
```

</td>
</tr>
</tbody>
</table>

---

### Rule 6.2 (Required)

Single-bit named bit-fields must not be declared as signed types, because a 1-bit signed integer can only store values 0 and -1 (not 1).

**Fix:** Declare single-bit fields as `unsigned int` or `bool`.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
struct Controls {
    signed int mode : 1; /* Non-compliant: 1-bit signed integer stores 0 or -1 */
};
```

</td>
<td valign="top">

```c
struct Controls {
    unsigned int mode : 1; /* Compliant */
};
```

</td>
</tr>
</tbody>
</table>

---

## 8. Literals & Constants (Section 7)

---

### Rule 7.1 (Required)

Octal constants (leading zero, e.g., `012`) must not be used, as they are easily confused with decimal constants.

**Fix:** Use decimal or hexadecimal representations.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int code = 052; /* Non-compliant: octal literal equals 42 in decimal */
```

</td>
<td valign="top">

```c
int code = 42;    /* Compliant decimal */
int hex_code = 0x2AU; /* Compliant hex */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 7.2 (Required)

A 'u' or 'U' suffix must be applied to all unsigned integer literal constants to avoid implicit type ambiguity.

**Fix:** Append the `U` suffix to unsigned constants.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
uint32_t mask = 0x80000000; /* Non-compliant: missing 'U' suffix */
```

</td>
<td valign="top">

```c
uint32_t mask = 0x80000000U; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 7.3 (Required)

Lowercase 'l' must not be used in numeric suffixes because it is visually identical to the digit '1'. Always use uppercase 'L'.

**Fix:** Use uppercase `L`.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int64_t val = 100l; /* Non-compliant: lowercase 'l' */
```

</td>
<td valign="top">

```c
int64_t val = 100L; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 7.4 (Required)

String literals must not be assigned to non-const pointers, because writing to string literal memory causes undefined behavior.

**Fix:** Use a pointer to `const char`.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
char *str = "Hello"; /* Non-compliant: missing const qualifier */
```

</td>
<td valign="top">

```c
const char *str = "Hello"; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

## 9. Declarations & Definitions (Section 8)

---

### Rule 8.1 (Required)

Types must be explicitly specified in all declarations. Implicit `int` defaults are forbidden.

**Fix:** Explicitly state the data type.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
static count = 0; /* Non-compliant: implicit int type */
```

</td>
<td valign="top">

```c
static int32_t count = 0; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 8.2 (Required)

Function prototypes must be declared in prototype form with named parameters. Empty parameter lists are forbidden (use `void`).

**Fix:** State parameter names and types explicitly or specify `void`.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int calculate(); /* Non-compliant: missing parameter list / void */
```

</td>
<td valign="top">

```c
int calculate(void); /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 8.3 (Required)

All declarations of an object or function must use identical parameter names, types, and qualifiers across all files.

**Fix:** Use exact matching names across declarations and definitions.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
/* Header.h */
void update(int value);

/* Source.c */
void update(int speed) { /* Non-compliant: parameter name mismatch */
    (void)speed;
}
```

</td>
<td valign="top">

```c
/* Header.h */
void update(int value);

/* Source.c */
void update(int value) { /* Compliant: identical parameter name and type */
    (void)value;
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 8.4 (Required)

A compatible declaration must be visible when an object or function with external linkage is defined (i.e., include the corresponding header file).

**Fix:** Include the header file that contains the `extern` declaration.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
/* my_module.c */
int global_sensor_val = 10; /* Non-compliant: no header file included declaring global_sensor_val */
```

</td>
<td valign="top">

```c
#include "my_module.h"
int global_sensor_val = 10; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 8.5 (Required)

An external object or function shall be declared in exactly one header file to maintain a single source of truth.

**Fix:** Declare the object in one central header file and `#include` it.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
/* file1.c */ extern int mode;
/* file2.c */ extern int mode; /* Non-compliant: repeated extern declarations across C files */
```

</td>
<td valign="top">

```c
/* mode.h */
#ifndef MODE_H
#define MODE_H
extern int mode; /* Compliant: single declaration in one header */
#endif

/* file1.c */
#include "mode.h"
int mode = 0;

/* file2.c */
#include "mode.h"
void use_mode(void) {
    mode = 1;
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 8.6 (Required)

An identifier with external linkage must have exactly one definition across the entire project.

**Fix:** Define the variable once in a single `.c` file and reference it via header `extern` declarations elsewhere.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
/* file1.c */ int system_state = 0;
/* file2.c */ int system_state = 0; /* Non-compliant: duplicate external definition */
```

</td>
<td valign="top">

```c
/* system_state.h */
extern int system_state;

/* system_state.c */
int system_state = 0; /* Compliant: single definition */

/* other.c */
#include "system_state.h"
void set_state(int s) {
    system_state = s;
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 8.7 (Advisory)

Functions and objects should be declared `static` (internal linkage) if they are not referenced outside their translation unit.

**Fix:** Add the `static` specifier.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int internal_helper(void) { return 1; } /* Non-compliant: exposed externally unnecessarily */
```

</td>
<td valign="top">

```c
static int internal_helper(void) { return 1; } /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 8.8 (Required)

The `static` keyword must be present on all declarations and definitions of objects and functions with internal linkage.

**Fix:** Place `static` on both the prototype and definition.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
static int foo(void);
int foo(void) { return 0; } /* Non-compliant: missing static on definition */
```

</td>
<td valign="top">

```c
static int foo(void);
static int foo(void) { return 0; } /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 8.9 (Advisory)

An object should be defined at block scope (inside a function) if it is only accessed within that single function.

**Fix:** Move variable definition inside function block.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
static int step_counter = 0; /* Non-compliant: file-scope variable used only in process() */

void process(void) {
    step_counter++;
}
```

</td>
<td valign="top">

```c
void process(void) {
    static int step_counter = 0; /* Compliant */
    step_counter++;
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 8.10 (Required)

Inline functions must be declared with the `static` storage specifier to prevent symbol linkage ambiguities.

**Fix:** Declare as `static inline`.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
inline int add(int a, int b) { return a + b; } /* Non-compliant: missing static */
```

</td>
<td valign="top">

```c
static inline int add(int a, int b) { return a + b; } /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 8.11 (Advisory)

Arrays declared with external linkage should have their size explicitly specified in the `extern` declaration.

**Fix:** Include the array size.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
extern int lookup_table[]; /* Non-compliant: array bound omitted */
```

</td>
<td valign="top">

```c
extern int lookup_table[256]; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 8.12 (Required)

Within an `enum` list, implicit element values must not conflict with explicit values assigned elsewhere in the enum.

**Fix:** Assign unique values to each enum element.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
enum Mode {
    MODE_A = 1,
    MODE_B,      /* Implicitly 2 */
    MODE_C = 1   /* Non-compliant: duplicate value 1 */
};
```

</td>
<td valign="top">

```c
enum Mode {
    MODE_A = 1,
    MODE_B = 2,
    MODE_C = 3   /* Compliant: unique values */
};
```

</td>
</tr>
</tbody>
</table>

---

### Rule 8.13 (Advisory)

A pointer parameter should point to a `const`-qualified type if the function does not modify the underlying object.

**Fix:** Add `const` qualifier to pointer parameter.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void print_val(int *p) {
    printf("%d", *p); /* Non-compliant: p does not modify *p, should be const */
}
```

</td>
<td valign="top">

```c
void print_val(const int *p) {
    printf("%d", *p); /* Compliant */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 8.14 (Required)

The C99 `restrict` type qualifier shall not be used, as it introduces compiler optimization assumptions that static analysis tools cannot easily verify.

**Fix:** Remove `restrict` qualifier.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void copy(int * restrict dst, const int * restrict src); /* Non-compliant */
```

</td>
<td valign="top">

```c
void copy(int *dst, const int *src); /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

## 10. Initialization (Section 9)

---

### Rule 9.1 (Mandatory)

Local stack variables (automatic objects) must be assigned a value before being read.

**Fix:** Initialize local variables upon declaration.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void compute(void) {
    int total;
    int x = total + 5; /* Non-compliant: total read uninitialized */
}
```

</td>
<td valign="top">

```c
void compute(void) {
    int total = 0;
    int x = total + 5; /* Compliant */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 9.2 (Required)

Initializers for nested aggregates (`struct` or array) or unions must be explicitly enclosed in braces `{}`.

**Fix:** Enclose sub-arrays/structures in braces.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int arr[2][2] = { 1, 2, 3, 4 }; /* Non-compliant: missing inner braces */
```

</td>
<td valign="top">

```c
int arr[2][2] = { { 1, 2 }, { 3, 4 } }; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 9.3 (Required)

Arrays shall not be partially initialized. Either initialize all elements or none.

**Fix:** Fully initialize all elements or initialize the array to zero completely using `{ 0 }`.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int values[5] = { 1, 2 }; /* Non-compliant: 3 elements implicitly zeroed */
```

</td>
<td valign="top">

```c
int values[5] = { 1, 2, 0, 0, 0 }; /* Compliant */
/* Or */
int values[5] = { 0 };             /* Compliant complete zero initialization */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 9.4 (Required)

An element of an object shall not be initialized more than once in an initializer list.

**Fix:** Ensure each element index is initialized once.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int arr[3] = { [0] = 1, [0] = 2, 3 }; /* Non-compliant: index 0 initialized twice */
```

</td>
<td valign="top">

```c
int arr[3] = { [0] = 1, [1] = 2, [2] = 3 }; /* Compliant: each element once */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 9.5 (Required)

Where designated initializers are used for array objects, the array size must be explicitly declared in the type definition.

**Fix:** Explicitly state array dimension.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int arr[] = { [0] = 1, [2] = 5 }; /* Non-compliant: size inferred implicitly */
```

</td>
<td valign="top">

```c
int arr[3] = { [0] = 1, [2] = 5 }; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

## 11. Essential Type Model (Section 10)

---

### Rule 10.1 (Required)

Operands shall not be used with inappropriate essential types (e.g., performing bitwise operations on signed integers or using floating-point types as array indexes).

**Fix:** Cast or operate on explicit unsigned integer types.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int32_t val = -5;
int32_t res = val << 2; /* Non-compliant: bitwise shift on signed integer */
```

</td>
<td valign="top">

```c
uint32_t val = 5U;
uint32_t res = val << 2U; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 10.2 (Required)

Expressions of character type shall not be used in inappropriate arithmetic contexts (e.g., adding numbers directly to raw character types).

**Fix:** Perform arithmetic on an explicit integer conversion of the character value.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
char c = 'a';
char next = c + 3; /* Non-compliant: character arithmetic */
```

</td>
<td valign="top">

```c
char c = 'a';
int32_t offset = 3;
char next = (char)((int32_t)c + offset); /* Compliant: explicit integer arithmetic */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 10.3 (Required)

An expression value shall not be assigned to an object with a narrower essential type or a different type category without an explicit cast.

**Fix:** Add an explicit cast to acknowledge truncation.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
uint32_t big = 500U;
uint8_t small;
small = big; /* Non-compliant: implicit truncation */
```

</td>
<td valign="top">

```c
small = (uint8_t)big; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 10.4 (Required)

Both operands of a binary operator must have the same essential type category (e.g., do not mix signed and unsigned types in addition).

**Fix:** Cast one operand explicitly so types match.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
uint32_t u = 10U;
int32_t  s = -5;
uint32_t res = u + s; /* Non-compliant: mixing signed and unsigned */
```

</td>
<td valign="top">

```c
uint32_t res = u + (uint32_t)s; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 10.5 (Advisory)

The value of an expression should not be explicitly cast to an inappropriate essential type (e.g., casting a float to an enum).

**Fix:** Convert through intermediate integer types or explicit mapping logic.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
float f = 1.5f;
enum Mode { MODE_OFF = 0, MODE_ON = 1 };
enum Mode m = (enum Mode)f; /* Non-compliant */
```

</td>
<td valign="top">

```c
float f = 1.5f;
enum Mode { MODE_OFF = 0, MODE_ON = 1 };
int32_t mode_id = (int32_t)f;
enum Mode m;

if (mode_id == 0) {
    m = MODE_OFF;
} else {
    m = MODE_ON; /* Compliant: explicit mapping instead of float-to-enum cast */
}
(void)m;
```

</td>
</tr>
</tbody>
</table>

---

### Rule 10.6 (Required)

The value of a composite expression (e.g., `a + b`) shall not be assigned to an object of wider essential type without casting an operand first to prevent hidden overflow.

**Fix:** Cast an operand to the wider type prior to addition.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
uint16_t a = 60000U;
uint16_t b = 10000U;
uint32_t total = a + b; /* Non-compliant: addition overflows 16-bit before assignment */
```

</td>
<td valign="top">

```c
uint32_t total = (uint32_t)a + b; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 10.7 (Required)

Operands of a composite expression shall not undergo implicit conversions to wider types when combined with wider variables.

**Fix:** Explicitly cast operands to wider types before the composite operation.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
uint16_t a = 10U;
uint16_t b = 20U;
uint32_t c = 100U;
uint32_t res = (a + b) + c; /* Non-compliant implicit conversion inside composite */
```

</td>
<td valign="top">

```c
uint16_t a = 10U;
uint16_t b = 20U;
uint32_t c = 100U;
uint32_t res = ((uint32_t)a + (uint32_t)b) + c; /* Compliant: explicit wider casts */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 10.8 (Required)

The value of a composite expression shall not be cast to a different essential type category or wider type.

**Fix:** Cast individual operands before computing composite result.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
uint16_t a = 10U;
uint16_t b = 20U;
uint32_t res = (uint32_t)(a + b); /* Non-compliant: cast applied to composite result */
```

</td>
<td valign="top">

```c
uint32_t res = (uint32_t)a + (uint32_t)b; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

## 12. Pointer Conversions (Section 11)

---

### Rule 11.1 (Required)

Conversions shall not be performed between a pointer to a function and any other type (including object pointers or integers).

**Fix:** Keep function pointers distinct; do not cast them to generic object pointers.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void (*fp)(void);
void *vp = (void *)fp; /* Non-compliant: function pointer cast to void pointer */
```

</td>
<td valign="top">

```c
void handler(void) {
}

void (*fp)(void) = handler; /* Compliant: assign only compatible function pointers */
fp();
```

</td>
</tr>
</tbody>
</table>

---

### Rule 11.2 (Required)

Conversions shall not be performed between a pointer to an incomplete type and any other type.

**Fix:** Avoid type casting opaque structure handles; pass and store them as the opaque pointer type.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
struct Opaque *p;
uint32_t addr = (uint32_t)p; /* Non-compliant */
```

</td>
<td valign="top">

```c
struct Opaque;

void use_handle(struct Opaque *p) {
    process_opaque(p); /* Compliant: opaque pointer used without conversion */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 11.3 (Required)

A cast shall not be performed between a pointer to an object type and a pointer to a different object type due to alignment fault risks.

**Fix:** Use `memcpy` to copy bytes safely between different types.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
uint8_t buffer[4] = {0};
uint32_t *val = (uint32_t *)buffer; /* Non-compliant: strict aliasing / alignment violation */
```

</td>
<td valign="top">

```c
uint8_t buffer[4] = {0};
uint32_t val;
(void)memcpy(&val, buffer, sizeof(val)); /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 11.4 (Advisory)

Conversions should not be performed between a pointer to an object and an integer type unless addressing hardware memory-mapped registers.

**Fix:** Avoid treating pointers as integers in general software logic; keep pointer types intact.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int x = 10;
uint32_t addr = (uint32_t)&x; /* Non-compliant pointer to int conversion */
```

</td>
<td valign="top">

```c
int x = 10;
int *px = &x; /* Compliant: pointer retained as pointer type */
*px = 20;
```

</td>
</tr>
</tbody>
</table>

---

### Rule 11.5 (Advisory)

Conversion should not be performed from a pointer to `void` into a pointer to an object type.

**Fix:** Pass typed object pointers directly whenever possible.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void *vptr = get_buffer();
uint32_t *iptr = (uint32_t *)vptr; /* Non-compliant */
```

</td>
<td valign="top">

```c
uint32_t *get_buffer(void);
uint32_t *iptr = get_buffer(); /* Compliant: typed pointer, no void* cast */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 11.6 (Required)

Casts shall not be performed between a pointer to `void` and an arithmetic type (integer or float).

**Fix:** Do not convert between `void *` and arithmetic types. Keep pointers typed, or obtain addresses from typed APIs.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void *vp = (void *)0x1000U; /* Non-compliant */
```

</td>
<td valign="top">

```c
volatile uint32_t *get_reg_block(void);
volatile uint32_t *const reg = get_reg_block();
*reg = 0U; /* Compliant: typed pointer, no void-pointer/arithmetic conversion */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 11.7 (Required)

Casts shall not be performed between a pointer to an object and a non-integer arithmetic type (such as `float`).

**Fix:** Use standard `memcpy` operations for bit pattern analysis.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
float f = 3.14f;
uint32_t *p = (uint32_t *)&f; /* Non-compliant pointer reinterpret */
```

</td>
<td valign="top">

```c
float f = 3.14f;
uint32_t bits = 0U;
(void)memcpy(&bits, &f, sizeof(bits)); /* Compliant: copy bits without invalid pointer cast */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 11.8 (Required)

Casts shall not remove `const` or `volatile` qualification from a pointer's referenced type.

**Fix:** Retain `const` qualifiers throughout parameter chains and mutate only non-const objects.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void write_data(const int *p) {
    int *mutable_p = (int *)p; /* Non-compliant: removes const qualifier */
    *mutable_p = 10;
}
```

</td>
<td valign="top">

```c
void write_data(int *p) {
    *p = 10; /* Compliant: parameter is non-const when mutation is required */
}

void read_data(const int *p) {
    int value = *p; /* Compliant: const retained for read-only access */
    (void)value;
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 11.9 (Required)

The macro `NULL` shall be the only permitted form of null pointer constant (do not use raw `0`).

**Fix:** Use `NULL`.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int *ptr = 0; /* Non-compliant: raw 0 used as null pointer */
```

</td>
<td valign="top">

```c
int *ptr = NULL; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

## 13. Expressions (Section 12)

---

### Rule 12.1 (Advisory)

Precedence of operators within complex expressions should be made explicit using parentheses.

**Fix:** Add explicit parenthesized groupings.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int res = a + b << c * d; /* Non-compliant: relies on complex precedence */
```

</td>
<td valign="top">

```c
int res = (a + b) << (c * d); /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 12.2 (Required)

The right-hand operand of a shift operator must be greater than or equal to 0 and strictly less than the bit-width of the left operand.

**Fix:** Ensure shift amounts stay strictly within 0 to (width - 1).

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
uint32_t val = 1U;
uint32_t res = val << 32U; /* Non-compliant: shifting 32-bit int by 32 bits is undefined */
```

</td>
<td valign="top">

```c
uint32_t res = val << 31U; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 12.3 (Advisory)

The comma operator `,` should not be used to sequence expressions.

**Fix:** Split expressions onto separate lines.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
a = 1, b = 2; /* Non-compliant: comma operator used */
```

</td>
<td valign="top">

```c
a = 1;
b = 2; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 12.4 (Advisory)

Evaluation of constant expressions should not lead to unsigned integer wrap-around.

**Fix:** Use explicit maximum macros (e.g., `UINT32_MAX`).

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
uint32_t x = 0U - 1U; /* Non-compliant: wrap-around in constant expression */
```

</td>
<td valign="top">

```c
uint32_t x = UINT32_MAX; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

## 14. Side Effects & Operations (Section 13)

---

### Rule 13.1 (Required)

Initializer lists shall not contain persistent side effects.

**Fix:** Increment variables outside the initializer list.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int i = 0;
int arr[2] = { i++, i++ }; /* Non-compliant: unsequenced side effects in initializer */
```

</td>
<td valign="top">

```c
int arr[2];
arr[0] = i;
i++;
arr[1] = i;
i++; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 13.2 (Required)

Expression evaluation order shall not rely on unsequenced side effects.

**Fix:** Separate increments onto separate statements.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int x = 5;
int y = x++ + x; /* Non-compliant: undefined evaluation order */
```

</td>
<td valign="top">

```c
int x = 5;
int y = x + x;
x++; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 13.3 (Advisory)

Increment (`++`) and decrement (`--`) operators should not be mixed with other operators in the same expression.

**Fix:** Isolate increment/decrement on their own standalone line.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
b = a++ + 5; /* Non-compliant */
```

</td>
<td valign="top">

```c
b = a + 5;
a++; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 13.4 (Advisory)

The result of an assignment operator should not be used inside expressions or condition tests.

**Fix:** Perform assignment prior to evaluating the condition.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
if (x = get_val()) { /* Non-compliant: assignment used as condition */ }
```

</td>
<td valign="top">

```c
x = get_val();
if (x != 0) { /* Compliant */ }
```

</td>
</tr>
</tbody>
</table>

---

### Rule 13.5 (Required)

The right-hand side of logical operators (`&&` or `||`) must not contain side effects because short-circuit evaluation makes execution conditional.

**Fix:** Evaluate functions with side effects prior to the logical condition.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
if (flag && (update_counter() > 0)) { /* Non-compliant: update_counter skipped if flag is false */ }
```

</td>
<td valign="top">

```c
int status = update_counter();
if (flag && (status > 0)) { /* Compliant */ }
```

</td>
</tr>
</tbody>
</table>

---

### Rule 13.6 (Required)

The operand of the `sizeof` operator must not contain expressions with side effects, because `sizeof` does not evaluate its operand at runtime.

**Fix:** Pass only types or variables to `sizeof`.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
size_t s = sizeof(i++); /* Non-compliant: i++ is never executed */
```

</td>
<td valign="top">

```c
size_t s = sizeof(i); /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

## 15. Control Statement Expressions (Section 14)

---

### Rule 14.1 (Required)

A loop counter shall not have an essential floating-point type due to accumulation of rounding errors.

**Fix:** Use integer loop counters and calculate float equivalents inside.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
for (float f = 0.0f; f < 1.0f; f += 0.1f) { /* Non-compliant: float loop counter */ }
```

</td>
<td valign="top">

```c
for (uint32_t i = 0U; i < 10U; i++) {
    float f = (float)i * 0.1f; /* Compliant */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 14.2 (Required)

A `for` loop shall be well-formed with a single loop counter modified consistently in the loop clause.

**Fix:** Control a single loop variable in the `for` statement header.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int j = 10;
for (int i = 0; i < 10; i++, j--) { /* Non-compliant: modifying multiple loop counters */
    (void)j;
}
```

</td>
<td valign="top">

```c
int j = 10;
for (int i = 0; i < 10; i++) { /* Compliant: single loop counter */
    j--;
    (void)j;
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 14.3 (Required)

Controlling expressions in conditional statements shall not evaluate to invariant constants (always true or always false).

**Fix:** Remove redundant conditions and keep only meaningful checks.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
uint32_t u = 5U;
if (u >= 0U) { /* Non-compliant: unsigned int is always >= 0 (invariant true) */
    process(u);
}
```

</td>
<td valign="top">

```c
uint32_t u = 5U;
if (u > 0U) { /* Compliant: meaningful, non-invariant condition */
    process(u);
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 14.4 (Required)

The controlling expression of an `if`, `while`, or `for` statement must have essential Boolean type (not raw integers or pointers).

**Fix:** Use explicit comparison to return a boolean evaluation.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int status = 1;
if (status) { /* Non-compliant: status is an integer, not boolean */ }
```

</td>
<td valign="top">

```c
if (status != 0) { /* Compliant */ }
```

</td>
</tr>
</tbody>
</table>

---

## 16. Control Flow (Section 15)

---

### Rule 15.1 (Advisory)

The `goto` statement should not be used.

**Fix:** Refactor using standard control structures (`if`/`else` or helper cleanup functions).

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void process(bool error) {
    if (error) {
        goto exit_label; /* Non-compliant */
    }
    do_work();
exit_label:
    clean_up();
}
```

</td>
<td valign="top">

```c
void process(bool error) {
    if (!error) {
        do_work();
    }
    clean_up(); /* Compliant: structured control flow, no goto */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 15.2 (Required)

`goto` shall only jump to a label declared later in the same function (no backward jumps).

**Fix:** Use a `while` or `do-while` loop for backward repetition.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void retry_work(bool retry) {
back_label:
    do_work();
    if (retry) {
        goto back_label; /* Non-compliant backward jump */
    }
}
```

</td>
<td valign="top">

```c
void retry_work(bool retry) {
    do {
        do_work();
    } while (retry); /* Compliant: loop replaces backward goto */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 15.3 (Required)

Any label referenced by `goto` shall be declared in the same block or an enclosing block.

**Fix:** Restructure code flow to enter nested blocks normally, or place the label in an enclosing block.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void process(bool fail) {
    if (fail) {
        goto inner; /* Non-compliant: jump into a nested block */
    }
    {
    inner:
        clean_up();
    }
}
```

</td>
<td valign="top">

```c
void process(bool fail) {
    if (fail) {
        clean_up(); /* Compliant: enter nested logic via normal control flow */
    }
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 15.4 (Advisory)

There should be no more than one `break` or `goto` statement used to terminate any single loop block.

**Fix:** Combine loop termination conditions into the main loop control clause.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
for (int i = 0; i < 10; i++) {
    if (cond1) {
        break;
    }
    if (cond2) {
        break; /* Non-compliant: multiple break statements */
    }
}
```

</td>
<td valign="top">

```c
for (int i = 0; (i < 10) && (!cond1) && (!cond2); i++) {
    do_step(i); /* Compliant: single termination path via loop condition */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 15.5 (Advisory)

A function should have a single point of exit at the end of the function.

**Fix:** Use a single return variable set during logic processing.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int check(int x) {
    if (x < 0) return -1; /* Non-compliant: early return */
    return 1;
}
```

</td>
<td valign="top">

```c
int check(int x) {
    int ret = 1;
    if (x < 0) {
        ret = -1;
    }
    return ret; /* Compliant single exit */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 15.6 (Required)

The body of an `if`, `else`, `while`, `do-while`, or `for` statement shall be a compound statement enclosed in curly braces `{}`.

**Fix:** Always enclose the body in `{}`.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
if (flag)
    do_something(); /* Non-compliant: missing curly braces */
```

</td>
<td valign="top">

```c
if (flag) {
    do_something(); /* Compliant */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 15.7 (Required)

All `if ... else if` chains shall be terminated with a final `else` clause (even if empty with a comment).

**Fix:** Add a terminating `else` block.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
if (x == 1) {
    handle_one();
} else if (x == 2) {
    handle_two(); /* Non-compliant: missing final else */
}
```

</td>
<td valign="top">

```c
if (x == 1) {
    handle_one();
} else if (x == 2) {
    handle_two();
} else {
    handle_default(); /* Compliant: final else present */
}
```

</td>
</tr>
</tbody>
</table>

---

## 17. Switch Statements (Section 16)

---

### Rule 16.1 (Required)

All `switch` statements shall be well-formed syntax blocks (syntax and structure required by the switch rules set).

**Fix:** Use a braced `switch` body with properly formed clauses.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
switch (mode)
    case 1: /* Non-compliant: missing braces / well-formed switch body */
        run();
        break;
```

</td>
<td valign="top">

```c
switch (mode) {
    case 1:
        run();
        break;
    case 2:
        stop();
        break;
    default:
        handle_unknown();
        break; /* Compliant: well-formed switch */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 16.2 (Required)

A `switch` label shall only be used when directly enclosed in the outermost body of a `switch` statement (Duff's Device is forbidden).

**Fix:** Place `case` labels cleanly at top level of `switch`.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
switch (mark) {
    if (cond) {
        case 1: /* Non-compliant: case inside nested if */
            break;
    }
}
```

</td>
<td valign="top">

```c
switch (mark) {
    case 1:
        if (cond) {
            handle();
        }
        break; /* Compliant: case at switch body level */
    default:
        break;
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 16.3 (Required)

An unconditional `break` statement shall terminate every non-empty `case` clause (no implicit fall-through).

**Fix:** Add `break;` at the end of every non-empty `case`.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
switch (val) {
    case 1:
        do_a(); /* Non-compliant: falls through into case 2 */
    case 2:
        do_b();
        break;
}
```

</td>
<td valign="top">

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

</td>
</tr>
</tbody>
</table>

---

### Rule 16.4 (Required)

Every `switch` statement shall contain an explicit `default` clause.

**Fix:** Add a `default` case to handle unexpected inputs.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
switch (val) {
    case 1: process(); break; /* Non-compliant: missing default */
}
```

</td>
<td valign="top">

```c
switch (val) {
    case 1: process(); break;
    default: handle_error(); break; /* Compliant */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 16.5 (Required)

The `default` clause shall appear as either the first or last clause in a `switch` statement.

**Fix:** Move `default:` to the very end (or very beginning) of the `switch` block.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
switch (val) {
    case 1:
        handle_one();
        break;
    default: /* Non-compliant: default between case clauses */
        handle_default();
        break;
    case 2:
        handle_two();
        break;
}
```

</td>
<td valign="top">

```c
switch (val) {
    case 1:
        handle_one();
        break;
    case 2:
        handle_two();
        break;
    default:
        handle_default();
        break; /* Compliant: default is last */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 16.6 (Required)

Every `switch` statement shall contain at least two `case` clauses.

**Fix:** Use an `if` statement for single-condition tests, or add the missing cases.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
switch (val) {
    case 1:
        process();
        break;
    default:
        break; /* Non-compliant: only one case clause */
}
```

</td>
<td valign="top">

```c
if (val == 1) {
    process(); /* Compliant: if is appropriate for a single condition */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 16.7 (Required)

The controlling expression of a `switch` statement shall not have essential Boolean type.

**Fix:** Use an `if-else` statement for boolean conditions.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
switch (x == 5) { /* Non-compliant: boolean expression in switch */
    case 0:
        break;
    case 1:
        break;
    default:
        break;
}
```

</td>
<td valign="top">

```c
if (x == 5) {
    handle_match();
} else {
    handle_other(); /* Compliant: boolean handled with if/else */
}
```

</td>
</tr>
</tbody>
</table>

---

## 18. Functions (Section 17)

---

### Rule 17.1 (Required)

Variable length argument features from `<stdarg.h>` (`va_list`, `va_arg`, `va_start`) shall not be used due to lack of type safety.

**Fix:** Pass explicit typed arrays or structured parameters.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void log_err(const char *fmt, ...) { /* Non-compliant */
    (void)fmt;
}
```

</td>
<td valign="top">

```c
void log_err(const char *message, int32_t error_code) {
    write_log(message, error_code); /* Compliant: fixed, typed parameters */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 17.2 (Required)

Functions shall not call themselves directly or indirectly (no recursion) to guarantee bounded stack memory usage.

**Fix:** Rewrite using iterative loops.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
uint32_t factorial(uint32_t n) {
    return (n <= 1U) ? 1U : (n * factorial(n - 1U)); /* Non-compliant recursion */
}
```

</td>
<td valign="top">

```c
uint32_t factorial(uint32_t n) {
    uint32_t res = 1U;
    for (uint32_t i = 1U; i <= n; i++) {
        res *= i;
    }
    return res; /* Compliant iterative implementation */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 17.3 (Mandatory)

Functions shall not be declared implicitly. Prototype headers must be included before invocation.

**Fix:** Declare the function prototype before use.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void test(void) {
    compute(); /* Non-compliant if compute() prototype is missing */
}
```

</td>
<td valign="top">

```c
int32_t compute(void);

void test(void) {
    (void)compute(); /* Compliant: prototype visible before call */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 17.4 (Mandatory)

All exit paths from a function returning a non-void value shall return an explicit expression.

**Fix:** Ensure all paths return a value.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int val(int x) {
    if (x > 0) return 1;
    /* Non-compliant: falls off end without return expression */
}
```

</td>
<td valign="top">

```c
int val(int x) {
    int res = -1;
    if (x > 0) { res = 1; }
    return res; /* Compliant */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 17.5 (Advisory)

Function argument declarations using array notation should match expected array dimensions.

**Fix:** Ensure caller array allocations match parameter boundary specs.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void process(int arr[10]);

void caller(void) {
    int small[2] = {0, 1};
    process(small); /* Non-compliant: caller array smaller than declared size */
}
```

</td>
<td valign="top">

```c
void process(int arr[10]);

void caller(void) {
    int values[10] = {0};
    process(values); /* Compliant: array size matches declaration */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 17.6 (Mandatory)

The `static` keyword inside array parameter declarations (`void fn(int arr[static 10])`) shall not be used.

**Fix:** Use standard pointer or fixed-size array notation without `static`.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void fn(int arr[static 5]); /* Non-compliant */
```

</td>
<td valign="top">

```c
void fn(int arr[5]); /* Compliant: no static array bound in parameter */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 17.7 (Required)

The value returned by a function having a non-void return type shall be used or explicitly cast to `(void)`.

**Fix:** Cast ignored return values explicitly to `(void)`.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
calculate_data(); /* Non-compliant: return value ignored */
```

</td>
<td valign="top">

```c
(void)calculate_data(); /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 17.8 (Advisory)

Function parameters should not be modified within the function body (treat parameters as read-only inputs).

**Fix:** Copy parameter to a local stack variable.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void process(int val) {
    val++; /* Non-compliant: parameter mutated */
}
```

</td>
<td valign="top">

```c
void process(int val) {
    int local_val = val;
    local_val++; /* Compliant */
}
```

</td>
</tr>
</tbody>
</table>

---

## 19. Pointers & Arrays (Section 18)

---

### Rule 18.1 (Required)

Pointer arithmetic shall stay strictly within array bounds.

**Fix:** Keep pointer indices within bounds `[0 ... SIZE-1]` (one-past-end is allowed only for comparison, not dereference).

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int arr[5];
int *p = &arr[10]; /* Non-compliant: out of bounds */
```

</td>
<td valign="top">

```c
int arr[5];
int *p = &arr[4]; /* Compliant: within bounds */
*p = 1;
```

</td>
</tr>
</tbody>
</table>

---

### Rule 18.2 (Required)

Subtraction between pointers shall only be applied when both point to elements within the same array.

**Fix:** Subtract pointers only within shared array structures.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int a[5];
int b[5];
ptrdiff_t diff = &a[2] - &b[2]; /* Non-compliant: pointers to different objects */
```

</td>
<td valign="top">

```c
int a[5];
ptrdiff_t diff = &a[4] - &a[1]; /* Compliant: same array object */
(void)diff;
```

</td>
</tr>
</tbody>
</table>

---

### Rule 18.3 (Required)

Relational operators (`<`, `<=`, `>`, `>=`) shall not be applied to pointers pointing to different memory objects.

**Fix:** Perform relational comparisons only on pointers within the same array.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int a[5];
int b[5];
if (&a[0] < &b[0]) { /* Non-compliant: comparing addresses of distinct objects */
}
```

</td>
<td valign="top">

```c
int a[5];
int *p = &a[1];
int *q = &a[3];
if (p < q) { /* Compliant: both point into array a */
    process();
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 18.4 (Advisory)

Pointer arithmetic (`+`, `-`, `+=`, `-=`) should not be used. Array indexing `[]` should be used instead.

**Fix:** Use array subscript notation.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int *p = arr;
*(p + 2) = 10; /* Non-compliant pointer arithmetic */
```

</td>
<td valign="top">

```c
arr[2] = 10; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 18.5 (Advisory)

Declarations should not contain more than two levels of pointer indirection (avoid `***p`).

**Fix:** Simplify data models or wrap pointers in structures.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int ***triple_ptr; /* Non-compliant */
```

</td>
<td valign="top">

```c
typedef struct {
    int *row;
} RowRef;

RowRef *table; /* Compliant: at most two levels of indirection */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 18.6 (Required)

The address of an automatic storage object shall not be assigned to an object that outlives the function return.

**Fix:** Assign addresses of static or global variables only, or copy the value instead of the address.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int *global_ptr;

void setup(void) {
    int local_val = 10;
    global_ptr = &local_val; /* Non-compliant: dangling pointer when setup returns */
}
```

</td>
<td valign="top">

```c
int *global_ptr;
static int persistent_val = 10;

void setup(void) {
    global_ptr = &persistent_val; /* Compliant: static storage outlives the function */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 18.7 (Required)

Flexible array members (`struct { int n; int arr[]; }`) shall not be declared.

**Fix:** Declare array fields with explicit maximum sizes.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
struct Packet {
    int n;
    int arr[]; /* Non-compliant: flexible array member */
};
```

</td>
<td valign="top">

```c
#define PACKET_MAX (32)

struct Packet {
    int n;
    int arr[PACKET_MAX]; /* Compliant: fixed-size array member */
};
```

</td>
</tr>
</tbody>
</table>

---

### Rule 18.8 (Required)

Variable-length array (VLA) types shall not be used because stack sizing cannot be determined at compile time.

**Fix:** Use compile-time constant array dimensions.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void process(int n) {
    int buf[n]; /* Non-compliant: VLA */
}
```

</td>
<td valign="top">

```c
#define MAX_BUF (64U)
void process(int n) {
    int buf[MAX_BUF]; /* Compliant */
}
```

</td>
</tr>
</tbody>
</table>

---

## 20. Overlapping Storage / Unions (Section 19)

---

### Rule 19.1 (Mandatory)

Memory objects shall not be copied or assigned to overlapping objects (e.g., using `memcpy` on overlapping regions).

**Fix:** Use `memmove` for overlapping memory regions.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
char buf[20] = "Hello World";
memcpy(&buf[2], &buf[0], 5); /* Non-compliant: overlapping memory */
```

</td>
<td valign="top">

```c
(void)memmove(&buf[2], &buf[0], 5); /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 19.2 (Advisory)

The `union` keyword should not be used, as it allows type punning and unintended bit reinterpretation.

**Fix:** Use explicit structure containers with type flags.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
union Data {
    int i;
    float f;
}; /* Non-compliant */
```

</td>
<td valign="top">

```c
typedef enum {
    DATA_INT,
    DATA_FLOAT
} DataKind;

typedef struct {
    DataKind kind;
    int i;
    float f;
} Data; /* Compliant: no overlapping storage */
```

</td>
</tr>
</tbody>
</table>

---

## 21. Preprocessing Directives (Section 20)

---

### Rule 20.1 (Advisory)

`#include` directives should only be preceded by preprocessor directives or comments (not C statements).

**Fix:** Place all `#include` lines at the top of the file.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int x = 0;
#include "header.h" /* Non-compliant: include after code */
```

</td>
<td valign="top">

```c
#include "header.h" /* Compliant: includes before code */

int x = 0;
```

</td>
</tr>
</tbody>
</table>

---

### Rule 20.2 (Required)

Characters `'`, `"`, `\`, or `/*` shall not occur in `#include` header names.

**Fix:** Use forward slashes `/` in paths.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#include "dir\file.h" /* Non-compliant: backslash in header name */
```

</td>
<td valign="top">

```c
#include "dir/file.h" /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 20.3 (Required)

`#include` directives shall be followed by `<filename>` or `"filename"`.

**Fix:** Use double quotes or angle brackets.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#include file.h /* Non-compliant: missing quotes/brackets */
```

</td>
<td valign="top">

```c
#include "file.h" /* Compliant */
/* or */
#include <stdint.h>
```

</td>
</tr>
</tbody>
</table>

---

### Rule 20.4 (Required)

Macro names shall not shadow C language keywords.

**Fix:** Do not redefine standard C keywords; use distinct macro names.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#define int long /* Non-compliant: redefines keyword */
```

</td>
<td valign="top">

```c
#define INT32_WIDTH (32) /* Compliant: does not shadow a keyword */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 20.5 (Advisory)

`#undef` should not be used to undefine macros.

**Fix:** Use unique macro names instead of undefining and redefining.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#define MAX_SIZE (100U)
#undef MAX_SIZE /* Non-compliant */
#define MAX_SIZE (200U)
```

</td>
<td valign="top">

```c
#define MAX_SIZE_A (100U)
#define MAX_SIZE_B (200U) /* Compliant: no #undef */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 20.6 (Required)

Macro arguments shall not expand into preprocessor directives.

**Fix:** Keep macro arguments restricted to pure expressions.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#define M(x) x
M(#define X 1) /* Non-compliant: argument expands to a directive */
```

</td>
<td valign="top">

```c
#define SCALE(x) ((x) * 2)
int y = SCALE(3); /* Compliant: expression argument only */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 20.7 (Required)

Every parameter expanded within a macro definition shall be enclosed in parentheses.

**Fix:** Parenthesize parameters.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#define MULT(a, b) (a * b) /* Non-compliant */
```

</td>
<td valign="top">

```c
#define MULT(a, b) ((a) * (b)) /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 20.8 (Required)

Controlling expressions of `#if` or `#elif` shall evaluate to 0 or 1.

**Fix:** Compare explicitly against values so the result is 0 or 1.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#if (5 + 2) /* Non-compliant: controlling expression is not 0 or 1 */
#endif
```

</td>
<td valign="top">

```c
#if ((5 + 2) == 7) /* Compliant: evaluates to 1 */
#endif
```

</td>
</tr>
</tbody>
</table>

---

### Rule 20.9 (Required)

All identifiers used in `#if` or `#elif` expressions shall be defined before evaluation.

**Fix:** Use `defined()` checks first.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#if UNDEFINED_MACRO /* Non-compliant: identifier not defined */
#endif
```

</td>
<td valign="top">

```c
#if defined(FEATURE_X) && (FEATURE_X == 1) /* Compliant */
#endif
```

</td>
</tr>
</tbody>
</table>

---

### Rule 20.10 (Advisory)

The `#` (stringification) and `##` (token pasting) preprocessor operators should not be used.

**Fix:** Declare variables explicitly without macro concatenation.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#define MAKE_VAR(name) var_##name /* Non-compliant */
int MAKE_VAR(count);
```

</td>
<td valign="top">

```c
int var_count; /* Compliant: explicit declaration */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 20.11 (Required)

A macro parameter immediately following a `#` operator shall not be immediately followed by a `##` operator.

**Fix:** Avoid combining `#` and `##` on the same parameter; prefer explicit identifiers or separate macros.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#define BAD(x) #x ## y /* Non-compliant: # parameter immediately followed by ## */
```

</td>
<td valign="top">

```c
#define TIMEOUT_MS (100U)
uint32_t timeout = TIMEOUT_MS; /* Compliant: no # or ## operators */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 20.12 (Required)

A macro parameter used as an operand to the `#` or `##` operators, which is itself subject to further macro replacement, shall only be used as an operand to these operators (not also expanded normally in the same replacement list).

**Fix:** Do not mix stringification/pasting of a parameter with normal expansion of that same parameter; prefer explicit code.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#define M(x) #x x /* Non-compliant: parameter used with # and also expanded */
```

</td>
<td valign="top">

```c
#define NAME "sensor"
const char *label = NAME; /* Compliant: no mixed #/## parameter use */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 20.13 (Required)

A line whose first token is `#` shall be a valid preprocessing directive.

**Fix:** Use only valid preprocessor directives (`#include`, `#define`, `#if`, `#endif`, etc.).

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#not_a_directive 123 /* Non-compliant: invalid preprocessor directive */
```

</td>
<td valign="top">

```c
#define BUFFER_SIZE (64U) /* Compliant: valid directive */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 20.14 (Required)

All `#if`, `#ifdef`, `#ifndef` directives must be terminated with `#endif` in the same file.

**Fix:** Ensure balanced conditional preprocessor directives in every file.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
/* header.h */
#ifndef HEADER_H
#define HEADER_H
void api(void);
/* Non-compliant: missing #endif */
```

</td>
<td valign="top">

```c
/* header.h */
#ifndef HEADER_H
#define HEADER_H
void api(void);
#endif /* Compliant: matching #endif */
```

</td>
</tr>
</tbody>
</table>

---

## 22. Standard Libraries (Section 21)

---

### Rule 21.1 (Required)

`#define` and `#undef` shall not be used on standard library reserved identifiers or macros.

**Fix:** Include the appropriate standard header for reserved macros/identifiers.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#define NULL (0) /* Non-compliant */
```

</td>
<td valign="top">

```c
#include <stddef.h>
void *p = NULL; /* Compliant: NULL from standard header */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 21.2 (Required)

Reserved identifiers (such as names starting with `_` or `__`) shall not be declared for user functions/objects.

**Fix:** Remove leading underscores from identifier names.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int _my_var = 0; /* Non-compliant */
```

</td>
<td valign="top">

```c
int my_var = 0; /* Compliant */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 21.3 (Required)

`<stdlib.h>` dynamic memory functions (`malloc`, `calloc`, `realloc`, `free`) shall not be used.

**Fix:** Use static object declarations or fixed-size buffers.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int *p = malloc(sizeof(int)); /* Non-compliant */
```

</td>
<td valign="top">

```c
static int storage;
int *p = &storage; /* Compliant: no dynamic allocation */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 21.4 (Required)

Standard header `<setjmp.h>` and functions `setjmp`/`longjmp` shall not be used due to uncontrolled control flow jumps.

**Fix:** Use structured error returns and explicit control flow instead of non-local jumps.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#include <setjmp.h>
static jmp_buf env;

void recover(void) {
    longjmp(env, 1); /* Non-compliant */
}
```

</td>
<td valign="top">

```c
int32_t do_work(void) {
    if (failed()) {
        return -1; /* Compliant: explicit error return */
    }
    return 0;
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 21.5 (Required)

Standard header `<signal.h>` and asynchronous signal handling features shall not be used.

**Fix:** Handle exceptional conditions through polled status flags or dedicated RTOS/event mechanisms.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#include <signal.h>
signal(SIGINT, handler); /* Non-compliant */
```

</td>
<td valign="top">

```c
volatile bool shutdown_requested = false;

void service_loop(void) {
    if (shutdown_requested) {
        enter_safe_state(); /* Compliant: no signal.h */
    }
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 21.6 (Required)

Standard library I/O functions (`<stdio.h>`) shall not be used in embedded safety-critical software.

**Fix:** Direct diagnostic output to dedicated hardware UART drivers or log buffers.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
printf("Value: %d\n", val); /* Non-compliant */
```

</td>
<td valign="top">

```c
void uart_write(const char *msg);

void report(int32_t val) {
    char buf[32];
    (void)format_i32(buf, sizeof(buf), val);
    uart_write(buf); /* Compliant: no stdio */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 21.7 (Required)

String conversion functions (`atof`, `atoi`, `atol`, `atoll`) from `<stdlib.h>` shall not be used due to unbounded behavior on invalid inputs.

**Fix:** Use `strtol()` with range verification or a custom bounded parser.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
int val = atoi(str); /* Non-compliant */
```

</td>
<td valign="top">

```c
char *end = NULL;
long val = strtol(str, &end, 10);
if ((end == str) || (*end != '\0') || (val > INT_MAX) || (val < INT_MIN)) {
    handle_parse_error();
} else {
    use_value((int)val); /* Compliant: validated conversion */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 21.8 (Required)

System termination functions (`abort`, `exit`, `getenv`, `system`) from `<stdlib.h>` shall not be used.

**Fix:** Implement system safe-state recovery logic.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
exit(1); /* Non-compliant */
```

</td>
<td valign="top">

```c
void enter_safe_state(void) {
    disable_actuators();
    request_reset(); /* Compliant: controlled recovery, no exit/abort */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 21.9 (Required)

`bsearch` and `qsort` from `<stdlib.h>` shall not be used due to unverified function pointer callbacks and potential stack overhead.

**Fix:** Implement explicit, statically bounded sorting algorithms (e.g., insertion sort).

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
qsort(arr, n, sizeof(arr[0]), cmp); /* Non-compliant */
```

</td>
<td valign="top">

```c
void insertion_sort(int32_t *arr, size_t n) {
    for (size_t i = 1U; i < n; i++) {
        int32_t key = arr[i];
        size_t j = i;
        while ((j > 0U) && (arr[j - 1U] > key)) {
            arr[j] = arr[j - 1U];
            j--;
        }
        arr[j] = key; /* Compliant: no qsort/bsearch */
    }
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 21.10 (Required)

Standard header `<time.h>` date and time functions shall not be used.

**Fix:** Use a project-specific monotonic tick/counter from the platform timer driver.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#include <time.h>
time_t now = time(NULL); /* Non-compliant */
```

</td>
<td valign="top">

```c
uint32_t get_system_ticks(void); /* platform timer API */

uint32_t now = get_system_ticks(); /* Compliant: no time.h */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 21.11 (Required)

Standard header `<tgmath.h>` type-generic math library shall not be used.

**Fix:** Include the typed math header and call the explicitly typed function.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#include <tgmath.h>
double y = sqrt(x); /* Non-compliant via tgmath type-generic macro */
```

</td>
<td valign="top">

```c
#include <math.h>
double y = sqrt(x); /* Compliant: typed math.h function */
```

</td>
</tr>
</tbody>
</table>

---

### Rule 21.12 (Advisory)

Standard header `<fenv.h>` floating-point exception handling should not be used.

**Fix:** Validate floating-point inputs/outputs explicitly instead of relying on floating-environment traps.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
#include <fenv.h>
feclearexcept(FE_ALL_EXCEPT); /* Non-compliant */
```

</td>
<td valign="top">

```c
float safe_div(float a, float b) {
    if ((b == 0.0f) || isnan(a) || isnan(b) || isinf(a) || isinf(b)) {
        return 0.0f; /* Compliant: explicit checks, no fenv.h */
    }
    return a / b;
}
```

</td>
</tr>
</tbody>
</table>

---

## 23. Resources & Environment (Section 22)

---

### Rule 22.1 (Required)

All resources allocated dynamically (such as file handles or hardware locks) must be explicitly released on all path exits.

**Fix:** Ensure resource handles are explicitly released prior to every return path.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
void read_config(const char *path) {
    FILE *fp = fopen(path, "r");
    if (fp == NULL) {
        return;
    }
    parse(fp);
    return; /* Non-compliant: file handle not closed */
}
```

</td>
<td valign="top">

```c
void read_config(const char *path) {
    FILE *fp = fopen(path, "r");
    if (fp == NULL) {
        return;
    }
    parse(fp);
    (void)fclose(fp); /* Compliant: resource released */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 22.2 (Mandatory)

A resource shall not be released more than once (e.g., double-free or double-closing a handle).

**Fix:** Set the resource handle to `NULL` after release and check before closing.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
fclose(fp);
fclose(fp); /* Non-compliant: double release */
```

</td>
<td valign="top">

```c
if (fp != NULL) {
    (void)fclose(fp);
    fp = NULL; /* Compliant: prevent double release */
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 22.3 (Required)

The same file shall not be opened simultaneously for read and write on different streams.

**Fix:** Open a single stream with the required access mode, or use separate files.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
FILE *in = fopen("data.bin", "r");
FILE *out = fopen("data.bin", "w"); /* Non-compliant: same file, dual streams */
```

</td>
<td valign="top">

```c
FILE *fp = fopen("data.bin", "r+"); /* Compliant: one stream for the file */
if (fp != NULL) {
    /* read/write via the same stream */
    (void)fclose(fp);
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 22.4 (Required)

A read-only stream shall not be written to, and a write-only stream shall not be read from.

**Fix:** Open the stream with a mode that matches the intended operations.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
FILE *fp = fopen("log.txt", "r");
fputc('x', fp); /* Non-compliant: write to read-only stream */
```

</td>
<td valign="top">

```c
FILE *fp = fopen("log.txt", "w");
if (fp != NULL) {
    (void)fputc('x', fp); /* Compliant: write on write-mode stream */
    (void)fclose(fp);
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 22.5 (Mandatory)

Pointers to `FILE` objects shall not be dereferenced directly.

**Fix:** Interact with streams only through the standard library API.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
FILE *fp = fopen("a.txt", "r");
int fd = fp->_file; /* Non-compliant: direct FILE dereference / member access */
```

</td>
<td valign="top">

```c
FILE *fp = fopen("a.txt", "r");
if (fp != NULL) {
    int ch = fgetc(fp); /* Compliant: API access only */
    (void)ch;
    (void)fclose(fp);
}
```

</td>
</tr>
</tbody>
</table>

---

### Rule 22.6 (Required)

The value of a pointer to a closed `FILE` stream shall not be used.

**Fix:** Null out the pointer after closing and never use a closed stream.

<table>
<thead>
<tr>
<th width="50%" style="background:#3d1f1f;color:#ff8a8a;">Example</th>
<th width="50%" style="background:#1f3d1f;color:#8aff8a;">Fixed</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```c
FILE *fp = fopen("a.txt", "r");
(void)fclose(fp);
(void)fgetc(fp); /* Non-compliant: use after close */
```

</td>
<td valign="top">

```c
FILE *fp = fopen("a.txt", "r");
if (fp != NULL) {
    (void)fclose(fp);
    fp = NULL; /* Compliant: closed pointer invalidated */
}
```

</td>
</tr>
</tbody>
</table>

---

