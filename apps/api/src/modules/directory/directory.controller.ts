import { Controller, Get, Param, Query } from "@nestjs/common";
import { DirectoryService } from "./directory.service.js";
import { SearchPractitionersDto } from "./dto/search-practitioners.dto.js";

@Controller("practitioners")
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @Get()
  search(@Query() query: SearchPractitionersDto) {
    return this.directory.search(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.directory.findOne(id);
  }
}
