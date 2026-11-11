/* Fixture CID 90301 — MISRA C-2012 Rule 11.9 (null pointer constant) */
#include <stddef.h>

int *misra_null_ptr(void) {
  int *p = 0;
  return p;
}
