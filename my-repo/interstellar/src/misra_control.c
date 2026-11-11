/* Fixture CID 90300 — MISRA C-2012 Rule 15.7 (missing final else) */
#include "misra_control.h"

int misra_mode_handle(int mode) {
  if (mode == 1) {
    return 10;
  } else if (mode == 2) {
    return 20;
  }
  /* Non-compliant for Rule 15.7: if/else-if chain without final else */
  return 0;
}
