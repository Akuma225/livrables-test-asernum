import { SharingAccess, SharingMode, SharingStatus } from "../../../../generated/prisma/enums";

export class FilterSharingLinkListDto {
    status?: SharingStatus;
    mode?: SharingMode;
    access?: SharingAccess;
}