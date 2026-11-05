#include "nav_reader.h"

#include <stdlib.h>

static int nav_simulate_probe_fault(void)
{
    return 1;
}

NavReader *nav_get_reader(void)
{
    if (nav_simulate_probe_fault()) {
        return NULL;
    }
    return (NavReader *)malloc(sizeof(NavReader));
}
