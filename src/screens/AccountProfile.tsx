"use client";
import {useState,type FormEvent} from "react";
import {ActionLink,Button,DataState,Icon,Section} from "@/components/UI";
import {ShippingAddressFields} from "@/components/account/ShippingAddressFields";
import {useNFV} from "@/state/NFVContext";
import {formatAddress} from "@/lib/format";
import {copyText} from "@/data/account-copy";
import {siteAccountHref} from "@/auth/site-auth";
import {profileBirthDate} from "@/screens/profile-presentation";
import {reviewShippingAddress,type ShippingAddressDraft} from "@/account/shipping-address-model";
import {useSupportedShippingAreas} from "@/hooks/useSupportedShippingAreas";
import type {Address,Locale} from "@/types";

const ADDRESS_COPY={
 vi:{title:"Địa chỉ giao hàng",description:"Mỗi tài khoản lưu một địa chỉ dùng khi đặt hàng",edit:"Chỉnh sửa",add:"Thêm địa chỉ",saved:"Đã cập nhật địa chỉ giao hàng",current:"Địa chỉ hiện tại",empty:"Chưa có địa chỉ giao hàng",emptyBody:"Thêm địa chỉ để sử dụng khi mua hàng hoặc đăng ký CSA.",footnote:"Địa chỉ này độc lập với hồ sơ Auth và được Backend dùng khi tạo yêu cầu mua.",addTitle:"Thêm địa chỉ giao hàng",editTitle:"Chỉnh sửa địa chỉ giao hàng",recipient:"Người nhận *",namePlaceholder:"Họ và tên",phone:"Số điện thoại *",province:"Tỉnh / thành phố *",chooseProvince:"Chọn tỉnh/thành phố",ward:"Xã / phường *",chooseProvinceFirst:"Chọn tỉnh/thành phố trước",chooseWard:"Chọn xã/phường",detail:"Địa chỉ cụ thể *",detailPlaceholder:"Số nhà, ngõ/ngách, đường, thôn/xóm",loadingAddress:"Đang tải địa chỉ giao hàng...",loadingAreas:"Đang tải khu vực hỗ trợ...",areasError:"Không tải được khu vực giao hàng.",addressError:"Không tải được địa chỉ giao hàng.",saveError:"Không thể lưu địa chỉ. Vui lòng kiểm tra và thử lại.",unsupported:"Khu vực này hiện không còn được hỗ trợ. Vui lòng cập nhật địa chỉ.",retry:"Thử lại",invalid:"Vui lòng điền đầy đủ thông tin hợp lệ.",save:"Lưu địa chỉ",cancel:"Hủy"},
 en:{title:"Delivery address",description:"Each account stores one address to use when ordering",edit:"Edit",add:"Add address",saved:"Delivery address updated",current:"Current address",empty:"No delivery address",emptyBody:"Add an address to use for purchases or CSA registration.",footnote:"This address is separate from the Auth profile and is used by Backend when creating a purchase request.",addTitle:"Add delivery address",editTitle:"Edit delivery address",recipient:"Recipient *",namePlaceholder:"Full name",phone:"Phone number *",province:"Province / city *",chooseProvince:"Choose a province/city",ward:"Ward / commune *",chooseProvinceFirst:"Choose a province/city first",chooseWard:"Choose a ward/commune",detail:"Detailed address *",detailPlaceholder:"House number, street, village or neighborhood",loadingAddress:"Loading delivery address...",loadingAreas:"Loading supported areas...",areasError:"Delivery areas could not be loaded.",addressError:"The delivery address could not be loaded.",saveError:"The address could not be saved. Check it and try again.",unsupported:"This area is no longer supported. Please update the address.",retry:"Try again",invalid:"Please complete all required fields with valid information.",save:"Save address",cancel:"Cancel"}
} satisfies Record<Locale,Record<string,string>>;

export function ProfileView(){
 const {data,ui}=useNFV();
 const p=data.profile;
 const editHref=siteAccountHref(ui.locale,`/account/${ui.locale}?tab=profile`);
 const missing=copyText(ui.locale,"common.na");
 return <Section title={copyText(ui.locale,"profile.title")} description={copyText(ui.locale,"profile.description")} actions={<ActionLink small href={editHref}><Icon name="edit" size={14}/> {copyText(ui.locale,"profile.edit")}</ActionLink>}>
   <div className="acc-profile-info"><div><span>{copyText(ui.locale,"profile.name")}</span><strong>{p.name||missing}</strong></div><div><span>{copyText(ui.locale,"profile.phone")}</span><strong>{p.phone||missing}</strong></div><div><span>{copyText(ui.locale,"profile.birthDate")}</span><strong>{profileBirthDate(p.dateOfBirth,ui.locale)||missing}</strong></div><div><span>{copyText(ui.locale,"profile.email")}</span><strong>{p.email||copyText(ui.locale,"profile.noInformation")}</strong></div></div>
 </Section>;
}

export function AddressView(){
 const {data,ui,patch,setData,act,call,refreshResource}=useNFV();
 const copy=ADDRESS_COPY[ui.locale];
 const address=data.shippingAddress;
 const status=ui.accountFetchState.address;
 return <Section className="acc-single-address" title={copy.title} description={copy.description}
   actions={status!=="loading"&&status!=="error"&&!ui.addressEditing&&<Button small onClick={()=>patch({addressEditing:true,error:""})}><Icon name={address?"edit":"plus"} size={14}/> {address?copy.edit:copy.add}</Button>}>
   {status==="loading"?<DataState kind="loading" title={copy.loadingAddress}/>:status==="error"?<DataState kind="error" title={copy.addressError} action={{label:copy.retry,onClick:()=>void refreshResource("address")}}/>:ui.addressEditing?<AddressEditor initial={address||{name:data.profile.name,phone:data.profile.phone,city:"",ward:"",detail:"",provinceCode:"",wardCode:"",isSupported:true,isDefault:true}}
     isNew={!address} cancel={()=>patch({addressEditing:false,error:""})} busy={ui.busyKeys.includes("save:address")} save={async value=>{
       const result=await act("save:address",()=>call<Address>("saveShippingAddress",value),copy.saved);
       if(result){setData(s=>({...s,shippingAddress:{...value,...result,isDefault:true}}));patch({addressEditing:false});}
     }} saveError={ui.error?copy.saveError:""}/>:address?<div className="acc-one-address-display"><div className="acc-one-address-head"><Icon name="pin" size={17}/> <span>{copy.current}</span></div><strong>{address.name}</strong><div className="acc-one-address-phone">{address.phone}</div><p>{formatAddress(address)}</p>{address.isSupported===false&&<p className="help-error" role="alert">{copy.unsupported}</p>}</div>:
    <DataState icon="pin" title={copy.empty} description={copy.emptyBody}/>}<p className="acc-footnote">{copy.footnote}</p>
 </Section>;
}

function AddressEditor({initial,isNew,cancel,save,busy,saveError}:{initial:Address;isNew:boolean;cancel:()=>void;save:(v:Address)=>Promise<void>;busy:boolean;saveError:string}){
 const {ui}=useNFV();
 const copy=ADDRESS_COPY[ui.locale];
 const shipping=useSupportedShippingAreas(ui.locale);
 const initialDraft:ShippingAddressDraft={name:initial.name,phone:initial.phone,provinceCode:initial.isSupported===false?"":initial.provinceCode??"",wardCode:initial.isSupported===false?"":initial.wardCode??"",address:initial.detail};
 const [value,setValue]=useState(initialDraft),[submitted,setSubmitted]=useState(false);
 const review=reviewShippingAddress(value,shipping.areas);
 const changed=isNew||(Object.keys(initialDraft) as (keyof ShippingAddressDraft)[]).some(key=>value[key]!==initialDraft[key]);
 const submit=()=>{setSubmitted(true);if(!review.value||!changed)return;const province=shipping.areas.find(item=>item.code===review.value?.provinceCode),ward=province?.wards.find(item=>item.code===review.value?.wardCode);if(!province||!ward)return;void save({name:review.value.name,phone:review.value.phone,city:province.name,ward:ward.name,detail:review.value.address,provinceCode:province.code,wardCode:ward.code,isSupported:true,isDefault:true});};
 return <form id="accountAddressForm" className="acc-editor acc-one-address-form" noValidate onSubmit={(event:FormEvent)=>{event.preventDefault();submit();}}>
   <div className="acc-editor-head"><h3>{isNew?copy.addTitle:copy.editTitle}</h3></div><div className="acc-form-grid"><ShippingAddressFields locale={ui.locale} value={value} areas={shipping.areas} loading={shipping.loading} error={shipping.error} missing={submitted?review.missing:[]} onRetry={shipping.retry} onChange={setValue} copy={{name:copy.recipient,namePlaceholder:copy.namePlaceholder,phone:copy.phone,province:copy.province,chooseProvince:copy.chooseProvince,ward:copy.ward,chooseProvinceFirst:copy.chooseProvinceFirst,chooseWard:copy.chooseWard,address:copy.detail,addressPlaceholder:copy.detailPlaceholder,loading:copy.loadingAreas,loadError:copy.areasError,retry:copy.retry}}/></div>
   {submitted&&!review.complete&&<div className="help-error" role="alert">{copy.invalid}</div>}{saveError&&<div className="help-error" role="alert">{saveError}</div>}<div className="acc-form-actions"><Button type="submit" small loading={busy} disabled={busy||shipping.loading||shipping.error||!changed}>{copy.save}</Button><Button variant="outline" small disabled={busy} onClick={cancel}>{copy.cancel}</Button></div>
 </form>;
}
