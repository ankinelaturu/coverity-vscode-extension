#include "nav_reader.h"

static NavReader *active_nav_reader;

void nav_bind_reader(NavReader *reader)
{
    active_nav_reader = reader;
}

NavReader *nav_active_reader(void)
{
    return active_nav_reader;
}
