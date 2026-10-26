"use client";
import {useState,type FormEvent} from "react";
import {useWardOptions} from "@/hooks/useWardOptions";
import {ActionLink,Button,DataState,FormField,FormInput,FormSelect,Icon,Section} from "@/components/UI";
import {useNFV} from "@/state/NFVContext";
import {digits,formatAddress,validPhone} from "@/lib/format";
import {copyText} from "@/data/account-copy";
import {siteAccountHref} from "@/auth/site-auth";
import {profileBirthDate} from "@/screens/profile-presentation";
import type {Address,Locale} from "@/types";

const ADDRESS_COPY={
 vi:{title:"Địa chỉ giao hàng",description:"Mỗi tài khoản lưu một địa chỉ dùng khi đặt hàng",edit:"Chỉnh sửa",add:"Thêm địa chỉ",saved:"Đã cập nhật địa chỉ giao hàng",current:"Địa chỉ hiện tại",empty:"Chưa có địa chỉ giao hàng",emptyBody:"Thêm địa chỉ để sử dụng khi đặt hàng.",footnote:"Đây là địa chỉ được lưu trong tài khoản. Bạn vẫn có thể nhập địa chỉ khác cho một đơn hàng mà không thay đổi địa chỉ đã lưu. Địa chỉ của đơn cũ luôn được giữ nguyên.",addTitle:"Thêm địa chỉ giao hàng",editTitle:"Chỉnh sửa địa chỉ giao hàng",recipient:"Người nhận *",namePlaceholder:"Họ và tên",phone:"Số điện thoại *",province:"Tỉnh / thành phố *",provinceAria:"Tỉnh hoặc thành phố",chooseProvince:"Chọn tỉnh/thành phố",ward:"Xã / phường *",wardAria:"Xã hoặc phường",chooseProvinceFirst:"Chọn tỉnh/thành phố trước",loadingWards:"Đang tải xã/phường...",chooseWard:"Chọn xã/phường",invalidWard:"không còn hợp lệ",detail:"Địa chỉ cụ thể *",detailPlaceholder:"Số nhà, ngõ/ngách, đường, thôn/xóm",wardsError:"Không tải được danh sách xã/phường.",retry:"Thử lại",invalid:"Vui lòng điền đầy đủ thông tin hợp lệ.",save:"Lưu địa chỉ",cancel:"Hủy"},
 en:{title:"Delivery address",description:"Each account stores one address to use when ordering",edit:"Edit",add:"Add address",saved:"Delivery address updated",current:"Current address",empty:"No delivery address",emptyBody:"Add an address to use when ordering.",footnote:"This address is saved to your account. You can still enter a different address for an order without changing the saved address. Addresses on previous orders are always preserved.",addTitle:"Add delivery address",editTitle:"Edit delivery address",recipient:"Recipient *",namePlaceholder:"Full name",phone:"Phone number *",province:"Province / city *",provinceAria:"Province or city",chooseProvince:"Choose a province/city",ward:"Ward / commune *",wardAria:"Ward or commune",chooseProvinceFirst:"Choose a province/city first",loadingWards:"Loading wards/communes...",chooseWard:"Choose a ward/commune",invalidWard:"no longer valid",detail:"Detailed address *",detailPlaceholder:"House number, street, village or neighborhood",wardsError:"The ward/commune list could not be loaded.",retry:"Try again",invalid:"Please complete all required fields with valid information.",save:"Save address",cancel:"Cancel"}
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
 const {data,ui,patch,setData,act,call}=useNFV();
 const copy=ADDRESS_COPY[ui.locale];
 const address=data.addresses[0];
 return <Section className="acc-single-address" title={copy.title} description={copy.description}
   actions={!ui.addressEditing&&<Button small onClick={()=>patch({addressEditing:true})}><Icon name={address?"edit":"plus"} size={14}/> {address?copy.edit:copy.add}</Button>}>
   {ui.addressEditing?<AddressEditor initial={address||{name:data.profile.name,phone:data.profile.phone,city:"",ward:"",detail:"",isDefault:true}}
     isNew={!address} cancel={()=>patch({addressEditing:false})} busy={ui.busyKeys.includes("save:address")} save={async value=>{
       const result=await act("save:address",async()=>{const confirmed=await call<Address|void>("saveAddress",value);return confirmed||value;},copy.saved);
       if(result){setData(s=>({...s,addresses:[{...value,...result,isDefault:true}]}));patch({addressEditing:false});}
     }}/>:address?<div className="acc-one-address-display"><div className="acc-one-address-head"><Icon name="pin" size={17}/> <span>{copy.current}</span></div><strong>{address.name}</strong><div className="acc-one-address-phone">{address.phone}</div><p>{formatAddress(address)}</p></div>:
    <DataState icon="pin" title={copy.empty} description={copy.emptyBody}/>}<p className="acc-footnote">{copy.footnote}</p>
 </Section>;
}

function AddressEditor({initial,isNew,cancel,save,busy}:{initial:Address;isNew:boolean;cancel:()=>void;save:(v:Address)=>Promise<void>;busy:boolean}){
 const {data,ui}=useNFV();
 const copy=ADDRESS_COPY[ui.locale];
 const [value,setValue]=useState(initial),[touched,setTouched]=useState(false);
 const wardOptions=useWardOptions(value.city);
 const valid=value.name.trim().length>=2&&validPhone(value.phone)&&data.provinces.includes(value.city)&&wardOptions.options.includes(value.ward)&&value.detail.trim().length>=3;
 const changed=isNew||(["name","phone","city","ward","detail"] as const).some(k=>value[k]!==initial[k]);
 const update=(key:keyof Address,v:string)=>{setValue(s=>({...s,[key]:v}));setTouched(true);};
 return <form id="accountAddressForm" className="acc-editor acc-one-address-form" onSubmit={(e:FormEvent)=>{e.preventDefault();if(valid&&changed)void save(value);}}>
   <div className="acc-editor-head"><h3>{isNew?copy.addTitle:copy.editTitle}</h3></div><div className="acc-form-grid">
     <FormField label={copy.recipient}><FormInput name="name" maxLength={80} required placeholder={copy.namePlaceholder} autoComplete="name" value={value.name} onChange={e=>update("name",e.target.value)}/></FormField>
     <FormField label={copy.phone}><FormInput name="phone" type="tel" inputMode="numeric" maxLength={10} placeholder="09xxxxxxxx" required value={value.phone} onChange={e=>update("phone",digits(e.target.value))}/></FormField>
     <FormField label={copy.province} className="acc-address-field"><FormSelect name="city" aria-label={copy.provinceAria} required value={value.city} onChange={e=>{setValue(s=>({...s,city:e.target.value,ward:""}));setTouched(true);}}><option value="">{copy.chooseProvince}</option>{data.provinces.map(c=><option key={c}>{c}</option>)}</FormSelect></FormField>
     <FormField label={copy.ward} className="acc-address-field"><FormSelect name="ward" aria-label={copy.wardAria} required value={value.ward} disabled={!value.city||wardOptions.loading||!wardOptions.options.length} onChange={e=>update("ward",e.target.value)}><option value="">{!value.city?copy.chooseProvinceFirst:wardOptions.loading?copy.loadingWards:copy.chooseWard}</option>{value.ward&&!wardOptions.loading&&!wardOptions.options.includes(value.ward)&&<option value={value.ward} disabled>{value.ward} ({copy.invalidWard})</option>}{wardOptions.options.map(c=><option key={c}>{c}</option>)}</FormSelect></FormField>
     <FormField label={copy.detail} className="acc-wide acc-address-field"><FormInput name="detail" required maxLength={180} placeholder={copy.detailPlaceholder} value={value.detail} onChange={e=>update("detail",e.target.value)}/></FormField>
   </div>{wardOptions.error&&<div className="help-error" role="alert">{copy.wardsError} <Button small variant="outline" onClick={()=>void wardOptions.retry()}>{copy.retry}</Button></div>}
   <div className="help-error" role="alert">{touched&&!valid?copy.invalid:""}</div><div className="acc-form-actions"><Button type="submit" small loading={busy} disabled={!valid||!changed||wardOptions.loading}>{copy.save}</Button><Button variant="outline" small disabled={busy} onClick={cancel}>{copy.cancel}</Button></div>
 </form>;
}
